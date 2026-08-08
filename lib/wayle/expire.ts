import { prisma } from '@/lib/prisma'

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

  const stale = await prisma.paymentIntent.findMany({
    where: { status: 'PENDING', createdAt: { lt: cutoff } },
    include: { order: { include: { items: true } } },
    take: 20, // keep the checkout path cheap
  })

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
          data: { paymentStatus: 'EXPIRED', status: 'CANCELLED' },
        })

        for (const item of intent.order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
        }

        released += 1
      })
    } catch (error) {
      // One bad row must not block the checkout that triggered this sweep.
      console.error('Failed to expire payment intent', intent.id, error)
    }
  }

  return released
}
