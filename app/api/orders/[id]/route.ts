import { NextRequest, NextResponse } from 'next/server'
import { noStoreJson } from '@/lib/api-response'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-utils'
import { cancelOrderAndReleaseStock, releaseOrderStock } from '@/lib/orders/stock'
import { canTransition, isTerminalOrderStatus } from '@/lib/orders/status'

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
            product: true,
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

    const order = await prisma.$transaction(async (tx) => {
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
      }

      return tx.order.findUnique({
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

    await prisma.$transaction(async (tx) => {
      // Return the reservation BEFORE deleting. The OrderItem rows carry the
      // quantities and are cascade-deleted with the order, so releasing
      // afterwards is impossible — this was previously an unrecoverable leak.
      // A cancelled order has already had its stock returned, so this correctly
      // does nothing in that case.
      await cancelOrderAndReleaseStock(tx, id)

      // OrderItems and PaymentIntent are auto-deleted via onDelete: Cascade
      await tx.order.delete({ where: { id } })
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
