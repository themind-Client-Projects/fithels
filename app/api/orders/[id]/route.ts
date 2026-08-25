import { NextRequest, NextResponse } from 'next/server'
import { noStoreJson } from '@/lib/api-response'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-utils'
import { cancelOrderAndReleaseStock, releaseOrderStock } from '@/lib/orders/stock'
import { canTransition, isTerminalOrderStatus } from '@/lib/orders/status'
import { releaseCouponRedemption } from '@/lib/coupons/redeem'

/** Raised when another update changed the order's status first. */
class OrderConcurrencyError extends Error {
  constructor() {
    super('Order was modified by someone else')
    this.name = 'OrderConcurrencyError'
  }
}

// GET /api/orders/[id] - Get single order (auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return noStoreJson({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        items: {
          include: {
            // Named columns rather than the whole row. `product: true` shipped
            // descEn and descAr — unbounded Text holding the full product copy —
            // for every line of every order, to render a 60px thumbnail and a
            // title.
            product: {
              select: {
                id: true,
                slug: true,
                titleEn: true,
                titleAr: true,
                price: true,
                salePrice: true,
                images: true,
                isActive: true,
                // Per-pair rows, not a single number. A nested select is NOT
                // type-checked the way a top-level one is — `stock: true`
                // survived tsc here and only failed when Prisma ran it.
                variants: { select: { size: true, color: true, stock: true } },
              },
            },
          },
        },
        paymentIntent: {
          select: { status: true, failureReason: true, amountIqd: true },
        },
      },
    })

    if (!order) {
      return noStoreJson({ error: 'Order not found' }, { status: 404 })
    }

    // Customers can only view their own orders
    const isStaff = user.role === 'ADMIN' || user.role === 'EMPLOYEE'
    if (!isStaff && order.userId !== user.id) {
      return noStoreJson({ error: 'Unauthorized' }, { status: 403 })
    }

    return noStoreJson(order)
  } catch (error) {
    console.error('Error fetching order:', error)
    return noStoreJson(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

// PATCH /api/orders/[id] - Update order status + estimatedDelivery (ADMIN only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return noStoreJson({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { status, estimatedDelivery, notes, phone, location } = body

    const existing = await prisma.order.findUnique({ where: { id } })
    if (!existing) {
      return noStoreJson({ error: 'Order not found' }, { status: 404 })
    }

    const validStatuses = [
      'PENDING',
      'CONFIRMED',
      'PROCESSING',
      'IN_DELIVERY',
      'DELIVERED',
      'CANCELLED',
    ]

    if (status && !validStatuses.includes(status)) {
      return noStoreJson(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Enforce the transition graph, not just enum membership. Without this, a
    // cancelled order could be reopened and cancelled again, crediting its
    // stock on every pass, and a delivered order could be cancelled to return
    // goods that already shipped.
    if (status && !canTransition(existing.status, status)) {
      return noStoreJson(
        {
          error: isTerminalOrderStatus(existing.status)
            ? `This order is ${existing.status.toLowerCase()} and can no longer change status.`
            : `Cannot change an order from ${existing.status} to ${status}.`,
          reason: isTerminalOrderStatus(existing.status)
            ? 'ORDER_STATUS_TERMINAL'
            : 'ORDER_STATUS_TRANSITION_NOT_ALLOWED',
          from: existing.status,
          to: status,
        },
        { status: 409 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (status !== undefined) {
      updateData.status = status
      // Stamp deliveredAt only on the transition INTO delivered. Setting it
      // whenever status === 'DELIVERED' meant every later save of an already
      // delivered order (the edit form re-sends status on every save) silently
      // rewrote the real delivery date to today.
      if (status === 'DELIVERED' && existing.status !== 'DELIVERED') {
        const deliveredAt = new Date()
        updateData.deliveredAt = deliveredAt

        // Cash on delivery is collected at the door, so delivery IS payment.
        // Without this a delivered cash order stayed UNPAID forever, which the
        // customer saw as "awaiting payment" and made any payment-based
        // reporting treat every COD sale as uncollected.
        if (existing.paymentMethod === 'COD' && existing.paymentStatus !== 'PAID') {
          updateData.paymentStatus = 'PAID'
          updateData.paidAt = deliveredAt
        }
      }
    }

    if (estimatedDelivery !== undefined) {
      updateData.estimatedDelivery = estimatedDelivery
        ? new Date(estimatedDelivery)
        : null
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    if (phone !== undefined) {
      updateData.phone = phone
    }

    if (location !== undefined) {
      updateData.location = location
    }

    await prisma.$transaction(async (tx) => {
      // Optimistic concurrency. `existing` was read outside this transaction, so
      // two staff acting at the same instant both passed the transition check.
      // Applying the write only while the status is still what we validated
      // means the loser changes nothing and gets a 409.
      //
      // Without this, a simultaneous CANCELLED and DELIVERED both committed:
      // the cancel released the stock, then the delivery overwrote the status
      // unconditionally, leaving a DELIVERED order whose units had been put
      // back on the shelf — which is exactly the invariant lib/orders/stock.ts
      // exists to hold.
      const applied = await tx.order.updateMany({
        where: { id, status: existing.status },
        data: updateData,
      })

      if (applied.count === 0) {
        throw new OrderConcurrencyError()
      }

      // Having won the transition, return the reserved units. Before any of
      // this, cancelling silently destroyed inventory — nothing in this file
      // wrote to Product at all.
      if (status === 'CANCELLED' && existing.status !== 'CANCELLED') {
        await releaseOrderStock(tx, id)
        // A cancelled order did not happen, so the coupon it consumed goes back
        // to the shopper. This path claims the transition itself (the
        // conditional updateMany above) rather than going through
        // cancelOrderAndReleaseStock, so it has to release the coupon too.
        await releaseCouponRedemption(tx, id)
      }

      return true
    }, {
      // Cancelling walks every line item to credit stock, so the work inside
      // grows with basket size. On a remote pooled Postgres that overran the
      // 5s default and threw "A commit cannot be executed on an expired
      // transaction" — the admin saw a failed save while the status change had
      // in fact been applied.
      maxWait: 10_000,
      timeout: 20_000,
    })

    // Re-read outside the transaction: it is a pure read, and holding the
    // transaction open for it only lengthens the window other writers block on.
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                titleEn: true,
                titleAr: true,
                images: true,
              },
            },
          },
        },
        // The detail page replaces its order state with this response, so
        // omitting the intent made the "needs reconciliation" warning vanish
        // the moment staff changed the status — hiding exactly the case the
        // badge exists to surface.
        paymentIntent: { select: { status: true, failureReason: true } },
      },
    })

    return noStoreJson(order)
  } catch (error) {
    if (error instanceof OrderConcurrencyError) {
      return noStoreJson(
        {
          error: 'This order was changed by someone else. Reload and try again.',
          reason: 'ORDER_MODIFIED_CONCURRENTLY',
        },
        { status: 409 }
      )
    }
    console.error('Error updating order:', error)
    return noStoreJson(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}

// DELETE /api/orders/[id] - Delete order (ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user || user.role !== 'ADMIN') {
      return noStoreJson({ error: 'Unauthorized — only admins can delete orders' }, { status: 403 })
    }

    const { id } = await params

    const existing = await prisma.order.findUnique({
      where: { id },
      include: { paymentIntent: { select: { status: true } } },
    })
    if (!existing) {
      return noStoreJson({ error: 'Order not found' }, { status: 404 })
    }

    // Deleting an order whose payment is still in flight destroys the
    // PaymentIntent too (it cascades), so the webhook would later arrive with a
    // reference that resolves to nothing — the customer gets charged and no
    // record survives. Make the admin settle it first.
    if (existing.paymentIntent?.status === 'PENDING') {
      return noStoreJson(
        {
          error:
            'This order has a payment in progress. Wait for it to settle or cancel the order instead of deleting it.',
          reason: 'ORDER_HAS_PAYMENT_IN_PROGRESS',
        },
        { status: 409 }
      )
    }

    // A DELIVERED order is a completed sale. Deleting it drops its money from
    // the revenue figures and destroys the only record tying the missing stock
    // to a customer — the goods have gone, so there is nothing to release and
    // nothing to correct afterwards. Cancel is the reversible action; delete is
    // for orders that never happened.
    if (existing.status === 'DELIVERED') {
      return noStoreJson(
        {
          error:
            'This order has been delivered and cannot be deleted. Its record is what accounts for the stock that left the shop.',
          reason: 'ORDER_ALREADY_DELIVERED',
        },
        { status: 409 }
      )
    }

    // Money that arrived is money that has to stay accounted for, even on an
    // order that was later cancelled: deleting it makes the collected-revenue
    // figure disagree with the bank, and hides a refund somebody still owes.
    if (existing.paymentStatus === 'PAID') {
      return noStoreJson(
        {
          error:
            'This order has been paid. Refund and reconcile it before deleting, or cancel it instead.',
          reason: 'ORDER_ALREADY_PAID',
        },
        { status: 409 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // Return the reservation BEFORE deleting. The OrderItem rows carry the
      // quantities and are cascade-deleted with the order, so releasing
      // afterwards is impossible — this was previously an unrecoverable leak.
      // A cancelled order has already had its stock returned, so this correctly
      // does nothing in that case.
      await cancelOrderAndReleaseStock(tx, id)

      // deleteMany, not delete: a double-click or a retried request finds the
      // row already gone, and `delete` throws P2025 for a missing record, which
      // the catch below turned into a 500 for an operation that had in fact
      // succeeded — inviting a third attempt.
      // OrderItems and PaymentIntent are auto-deleted via onDelete: Cascade.
      await tx.order.deleteMany({ where: { id } })
    }, {
      // The same ceiling the cancel path already carries. This transaction does
      // strictly MORE work than that one — it credits every line's stock, voids
      // the coupon, then cascade-deletes — and it was still running on Prisma's
      // 5s default, so a large order against a pooled remote Postgres died with
      // "Transaction already closed" and surfaced as an unexplained 500.
      maxWait: 10_000,
      timeout: 20_000,
    })

    return noStoreJson({ success: true })
  } catch (error) {
    console.error('Error deleting order:', error)
    return noStoreJson(
      { error: 'Failed to delete order' },
      { status: 500 }
    )
  }
}
