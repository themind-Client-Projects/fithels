import type { NextRequest } from 'next/server'
import { noStoreJson } from '@/lib/api-response'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-utils'
import {
  parsePeriod,
  periodStart,
  summariseCustomers,
  summariseInventory,
  summariseSales,
  summariseTopProducts,
  type AnalyticsOrder,
} from '@/lib/analytics/report'

/**
 * GET /api/dashboard/analytics?period=1m|3m|6m|12m — ADMIN/EMPLOYEE only.
 *
 * Every figure is computed from ONE read of the period's orders rather than a
 * pile of independent aggregates. That is the point: aggregates drift apart the
 * moment two of them disagree about what counts — one excluding cancelled
 * orders, another forgetting to — and a page whose halves do not add up is
 * worse than a coarser one that does. lib/analytics/report.ts holds the rules,
 * as pure functions, so the same numbers can be recomputed and checked outside
 * a request.
 */

/**
 * Ceiling on how many orders one report reads.
 *
 * Well past anything this shop will place in a year, but present so a year-long
 * window cannot one day pull an unbounded set into memory. If it is ever hit
 * the response says so rather than quietly reporting a partial figure as fact.
 */
const MAX_ORDERS = 5000

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return noStoreJson({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = parsePeriod(searchParams.get('period'))
    const now = new Date()
    const since = periodStart(period, now)

    const ORDER_SHAPE = {
      id: true,
      userId: true,
      total: true,
      discount: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      createdAt: true,
      items: {
        select: {
          productId: true,
          quantity: true,
          price: true,
          size: true,
          color: true,
        },
      },
      user: { select: { id: true, name: true, email: true, phone: true } },
    } as const

    const [periodOrders, allOrders, products, placedInPeriod] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: since } },
        select: ORDER_SHAPE,
        orderBy: { createdAt: 'desc' },
        take: MAX_ORDERS,
      }),

      // Lifetime rows drive "how much has this customer ever spent" and "when
      // did we last hear from them", neither of which the window may truncate —
      // a customer who has not ordered inside it is precisely the one worth
      // finding.
      prisma.order.findMany({
        select: ORDER_SHAPE,
        orderBy: { createdAt: 'desc' },
        take: MAX_ORDERS,
      }),

      prisma.product.findMany({
        select: {
          id: true,
          titleAr: true,
          titleEn: true,
          isActive: true,
          // Only the first photo is rendered, but Postgres has no cheap way to
          // slice an array column, and these are short paths.
          images: true,
          sizes: true,
          variants: { select: { size: true, color: true, stock: true } },
        },
      }),

      prisma.order.count({ where: { createdAt: { gte: since } } }),
    ])

    const productTitles = new Map(products.map((p) => [p.id, p.titleAr || p.titleEn]))
    const productImages = new Map(products.map((p) => [p.id, p.images?.[0] ?? null]))

    // Orders that have neither shipped nor been cancelled are still sitting on
    // reserved stock. Taken from the lifetime set, not the window: a reservation
    // made before the window began is still holding those units today.
    const liveOrders = allOrders.filter(
      (o) => o.status !== 'CANCELLED' && o.status !== 'DELIVERED'
    )

    const sales = summariseSales(periodOrders as AnalyticsOrder[])
    const customers = summariseCustomers(
      periodOrders as AnalyticsOrder[],
      allOrders as AnalyticsOrder[],
      productTitles
    )
    const inventory = summariseInventory(products, liveOrders as AnalyticsOrder[])
    const topProducts = summariseTopProducts(
      periodOrders as AnalyticsOrder[],
      productTitles,
      productImages
    )

    const segments = {
      vip: customers.filter((c) => c.tier === 'vip').length,
      repeat: customers.filter((c) => c.tier === 'repeat').length,
      new: customers.filter((c) => c.tier === 'new').length,
      inactive: customers.filter((c) => c.tier === 'inactive').length,
    }

    return noStoreJson({
      period: {
        key: period,
        since: since.toISOString(),
        until: now.toISOString(),
      },
      // Said out loud so nobody has to infer it: every sales figure below
      // describes orders PLACED in this window.
      axis: 'createdAt',
      truncated: placedInPeriod > MAX_ORDERS,
      sales,
      customers,
      segments,
      inventory,
      topProducts,
    })
  } catch (error) {
    console.error('Error building analytics:', error)
    return noStoreJson({ error: 'Failed to build analytics' }, { status: 500 })
  }
}
