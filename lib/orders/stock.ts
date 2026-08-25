import type { Prisma } from '@prisma/client'
import { releaseCouponRedemption } from '@/lib/coupons/redeem'

/**
 * The single place an order's reserved stock is returned to the shelf.
 *
 * INVARIANT: stock is held by an order if and only if that order is not
 * CANCELLED. Every release therefore happens as part of the transition INTO
 * CANCELLED, and the conditional update below is what makes it exactly-once —
 * whoever moves the order out of a non-cancelled state does the release, and
 * everyone else matches 0 rows and does nothing.
 *
 * Guarding on the order (rather than on, say, the payment intent) is what stops
 * an admin cancellation and a failed-payment webhook from both returning the
 * same units: the second one to arrive finds the order already CANCELLED.
 *
 * Must be called inside a transaction so a later failure rolls the release back
 * with everything else.
 *
 * @returns true if this call performed the release, false if it was already done.
 */
export async function cancelOrderAndReleaseStock(
  tx: Prisma.TransactionClient,
  orderId: string
): Promise<boolean> {
  // DELIVERED is excluded as well as CANCELLED. Guarding only on CANCELLED let
  // the delete path release stock for goods that had already shipped: PATCH
  // correctly refuses DELIVERED -> CANCELLED via the transition graph, but
  // DELETE called straight through here and bypassed it, crediting inventory
  // that physically left the building.
  const claimed = await tx.order.updateMany({
    where: { id: orderId, status: { notIn: ['CANCELLED', 'DELIVERED'] } },
    data: { status: 'CANCELLED' },
  })

  if (claimed.count === 0) return false

  await releaseOrderStock(tx, orderId)
  await releaseCouponRedemption(tx, orderId)
  return true
}

/**
 * Returns an order's units to the shelf WITHOUT claiming the transition.
 *
 * Only call this when the caller has already won the move into CANCELLED — for
 * example via its own conditional update — otherwise the exactly-once guarantee
 * above is lost and stock gets credited twice.
 */
export async function releaseOrderStock(
  tx: Prisma.TransactionClient,
  orderId: string
): Promise<void> {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { productId: true, quantity: true, size: true, color: true },
  })

  for (const item of items) {
    // Back to the exact pair it came from. Crediting the product as a whole
    // would put a returned size 40 back as stock the shop could sell in any
    // size — the mirror of the overselling this replaced.
    //
    // updateMany, not update: an order placed before a colour was retired can
    // name a pair that no longer has a row, and `update` throws on a missing
    // record, which would abort the whole cancellation. Matching zero rows is
    // the right outcome there — there is nowhere to put the pair back.
    // A line with no pair recorded cannot be credited anywhere — there is no
    // row that owns those units. That is a real possibility on orders placed
    // before a size and colour became mandatory, and staying silent about it
    // means the shop is quietly short with nothing to explain why. Every other
    // "we cannot do the right thing here" branch in this codebase says so
    // loudly; this one used to be a bare `continue`.
    if (!item.size || !item.color) {
      console.warn(
        `[stock] order ${orderId}: ${item.quantity} unit(s) of product ` +
          `${item.productId} could not be returned to stock — the line records ` +
          `no size/colour, so there is no variant to credit. Adjust by hand.`
      )
      continue
    }

    await tx.productVariant.updateMany({
      where: {
        productId: item.productId,
        size: item.size,
        color: item.color,
      },
      data: { stock: { increment: item.quantity } },
    })
  }
}
