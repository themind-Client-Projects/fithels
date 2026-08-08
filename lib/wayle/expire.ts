import { prisma } from '@/lib/prisma'
import { cancelOrderAndReleaseStock } from '@/lib/orders/stock'

/** How long an unpaid Wayle link may hold reserved stock. */
export const PAYMENT_INTENT_TTL_MINUTES = 30

/**
 * Release stock held by payment attempts that were never completed.
 *
 * Stock is reserved when the link is created so that a paid order is always
 * fulfillable. The cost of that choice is abandoned checkouts sitting on stock,
 * and Wayle sends no webhook when a payer simply closes the tab — so nothing
 * would ever release it.
 *
 * This is called opportunistically before creating a new link rather than from
 * a cron job: it needs no scheduler or extra secret, and the work only happens
 * when someone is actually checking out. Each expiry uses the same conditional
 * claim as the webhook, so it can never race a late payment into double-
 * releasing stock.
 */
export async function releaseExpiredIntents(): Promise<number> {
  const cutoff = new Date(Date.now() - PAYMENT_INTENT_TTL_MINUTES * 60_000)

  const BATCH_SIZE = 20 // keep the checkout path cheap

  const stale = await prisma.paymentIntent.findMany({
    where: { status: 'PENDING', createdAt: { lt: cutoff } },
    include: { order: { include: { items: true } } },
    take: BATCH_SIZE,
  })

  // A full batch means there is probably more waiting. Say so rather than
  // silently draining 20 at a time and looking like the sweep is keeping up.
  if (stale.length === BATCH_SIZE) {
    const remaining = await prisma.paymentIntent.count({
      where: { status: 'PENDING', createdAt: { lt: cutoff } },
    })
    if (remaining > BATCH_SIZE) {
      console.warn(
        `Payment expiry backlog: ${remaining} abandoned reservations pending, releasing ${BATCH_SIZE} this pass. Consider scheduling POST /api/payments/expire.`
      )
    }
  }

  let released = 0

  for (const intent of stale) {
    try {
      await prisma.$transaction(async (tx) => {
        const claim = await tx.paymentIntent.updateMany({
          where: { id: intent.id, status: 'PENDING' },
          data: { status: 'EXPIRED', failureReason: 'ABANDONED' },
        })
        if (claim.count === 0) return // a webhook got there first

        await tx.order.update({
          where: { id: intent.orderId },
          data: { paymentStatus: 'EXPIRED' },
        })

        if (await cancelOrderAndReleaseStock(tx, intent.orderId)) {
          released += 1
        }
      })
    } catch (error) {
      // One bad row must not block the checkout that triggered this sweep.
      console.error('Failed to expire payment intent', intent.id, error)
    }
  }

  return released
}
