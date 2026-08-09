import type { Prisma } from '@prisma/client'

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
    select: { productId: true, quantity: true },
  })

  for (const item of items) {
    await tx.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantity } },
    })
  }
}
