import { noStoreJson } from '@/lib/api-response'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-utils'

/**
 * GET /api/dashboard/stats — dashboard figures (ADMIN/EMPLOYEE only).
 *
 * REVENUE MEANS MONEY ACTUALLY COLLECTED.
 *
 * This used to report `sum(total) where status != CANCELLED`, which counted
 * every order the moment it was placed — a cash-on-delivery order nobody had
 * paid for yet, and an online order whose payment link was issued and then
 * abandoned, both counted in full. On this database that reported $1,039.87
 * against $269.97 actually taken: overstated by 3.8x.
 *
 * `paymentStatus` is the only field that tracks money (Order.status is the
 * DELIVERY lifecycle). COD flips to PAID on delivery, WAYLE on the webhook, so
 * filtering on PAID gives cash in hand for both methods and matches what the
 * customer's own account page already counts as "spent".
 *
 * The figures the old number conflated are returned alongside it rather than
 * thrown away — for a cash-on-delivery shop, "how much is out with drivers" is
 * as important as "how much have we banked".
 */
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return noStoreJson({ error: 'Unauthorized' }, { status: 403 })
    }

    const [
      totalOrders,
      cancelledOrders,
      collected,
      outstanding,
      refundDue,
      discounts,
      activeProducts,
      totalCustomers,
      recentOrders,
    ] = await Promise.all([
      prisma.order.count(),

      prisma.order.count({ where: { status: 'CANCELLED' } }),

      // Banked. Includes orders later cancelled: the money did arrive, and
      // hiding it would make the ledger disagree with the bank.
      prisma.order.aggregate({
        _sum: { total: true },
        _count: true,
        where: { paymentStatus: 'PAID' },
      }),

      // Live orders still owing — mostly cash awaiting delivery.
      prisma.order.aggregate({
        _sum: { total: true },
        _count: true,
        where: { status: { not: 'CANCELLED' }, paymentStatus: { not: 'PAID' } },
      }),

      // Paid for, then cancelled. Every one of these is a refund somebody has
      // to action by hand; the payment webhook flags them
      // PAID_BUT_ORDER_CANCELLED_NEEDS_RECONCILIATION.
      prisma.order.aggregate({
        _sum: { total: true },
        _count: true,
        where: { status: 'CANCELLED', paymentStatus: 'PAID' },
      }),

      // What coupons have cost, over orders that actually stand.
      prisma.order.aggregate({
        _sum: { discount: true },
        where: { status: { not: 'CANCELLED' } },
      }),

      prisma.product.count({ where: { isActive: true } }),

      prisma.user.count({ where: { role: 'CUSTOMER' } }),

      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ])

    return noStoreJson({
      totalOrders,
      cancelledOrders,

      // The headline figure. Same key as before so nothing breaks, but it now
      // means collected rather than merely invoiced.
      totalRevenue: collected._sum.total ?? 0,
      paidOrders: collected._count,

      outstandingRevenue: outstanding._sum.total ?? 0,
      outstandingOrders: outstanding._count,

      refundDueAmount: refundDue._sum.total ?? 0,
      refundDueOrders: refundDue._count,

      totalDiscounts: discounts._sum.discount ?? 0,

      activeProducts,
      totalCustomers,
      recentOrders,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return noStoreJson({ error: 'Failed to fetch dashboard stats' }, { status: 500 })
  }
}
