/**
 * Checks the analytics figures against independently computed ones.
 *
 * The report functions build every number from one in-memory pass over the
 * orders. This recomputes the same numbers a completely different way — through
 * Postgres aggregates and counts — and fails loudly on any disagreement. A
 * figure that two unrelated methods agree on is a figure worth putting in front
 * of a shop owner; one that only the page can produce is not.
 */
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import {
  parsePeriod,
  periodStart,
  summariseCustomers,
  summariseInventory,
  summariseSales,
  summariseTopProducts,
  type AnalyticsOrder,
  type PeriodKey,
} from '../lib/analytics/report'

config({ path: '.env.local' })
config({ path: '.env' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

let failures = 0

/** Money is Float; compare to the cent rather than bit-for-bit. */
function check(label: string, mine: number, theirs: number, tolerance = 0.005) {
  const ok = Math.abs(mine - theirs) <= tolerance
  if (!ok) failures += 1
  const mark = ok ? 'ok  ' : 'FAIL'
  console.log(
    `  ${mark} ${label.padEnd(46)} report=${mine.toFixed(2).padStart(10)}  sql=${theirs.toFixed(2).padStart(10)}`
  )
}

const ORDER_SHAPE = {
  id: true, userId: true, total: true, discount: true,
  status: true, paymentStatus: true, paymentMethod: true, createdAt: true,
  items: { select: { productId: true, quantity: true, price: true, size: true, color: true } },
  user: { select: { id: true, name: true, email: true, phone: true } },
} as const

async function verifyPeriod(key: PeriodKey, now: Date) {
  const since = periodStart(key, now)
  console.log(`\n── period ${key} (since ${since.toISOString().slice(0, 10)}) ─────────────`)

  const periodOrders = await prisma.order.findMany({
    where: { createdAt: { gte: since } },
    select: ORDER_SHAPE,
  })
  const allOrders = await prisma.order.findMany({ select: ORDER_SHAPE })
  const products = await prisma.product.findMany({
    select: {
      id: true, titleAr: true, titleEn: true, isActive: true, images: true, sizes: true,
      variants: { select: { size: true, color: true, stock: true } },
    },
  })

  const sales = summariseSales(periodOrders as AnalyticsOrder[])
  const inWindow = { createdAt: { gte: since } }

  /* Money, straight from Postgres. */
  const collected = await prisma.order.aggregate({
    _sum: { total: true }, where: { ...inWindow, paymentStatus: 'PAID' },
  })
  check('collected', sales.collected, collected._sum.total ?? 0)
  check(
    'collected orders',
    sales.collectedOrders,
    await prisma.order.count({ where: { ...inWindow, paymentStatus: 'PAID' } })
  )

  const outstanding = await prisma.order.aggregate({
    _sum: { total: true },
    where: { ...inWindow, status: { not: 'CANCELLED' }, paymentStatus: { not: 'PAID' } },
  })
  check('outstanding', sales.outstanding, outstanding._sum.total ?? 0)

  const refund = await prisma.order.aggregate({
    _sum: { total: true }, where: { ...inWindow, status: 'CANCELLED', paymentStatus: 'PAID' },
  })
  check('refund due', sales.refundDue, refund._sum.total ?? 0)

  const discounts = await prisma.order.aggregate({
    _sum: { discount: true }, where: { ...inWindow, status: { not: 'CANCELLED' } },
  })
  check('discounts (live orders only)', sales.discounts, discounts._sum.discount ?? 0)

  const cancelled = await prisma.order.aggregate({
    _sum: { total: true }, where: { ...inWindow, status: 'CANCELLED' },
  })
  check('cancelled amount', sales.cancelledAmount, cancelled._sum.total ?? 0)
  check(
    'cancelled orders',
    sales.cancelledOrders,
    await prisma.order.count({ where: { ...inWindow, status: 'CANCELLED' } })
  )

  check(
    'orders placed',
    sales.placedOrders,
    await prisma.order.count({ where: inWindow })
  )

  /* Payment method split. */
  for (const method of ['COD', 'WAYLE'] as const) {
    const paid = await prisma.order.aggregate({
      _sum: { total: true },
      where: { ...inWindow, paymentMethod: method, paymentStatus: 'PAID' },
    })
    check(`${method}: paid amount`, sales.byMethod[method].paidAmount, paid._sum.total ?? 0)
    check(
      `${method}: paid orders`,
      sales.byMethod[method].paid,
      await prisma.order.count({ where: { ...inWindow, paymentMethod: method, paymentStatus: 'PAID' } })
    )
    check(
      `${method}: placed`,
      sales.byMethod[method].placed,
      await prisma.order.count({ where: { ...inWindow, paymentMethod: method } })
    )
  }

  /* Distinct buyers. */
  const buyerGroups = await prisma.order.groupBy({
    by: ['userId'], where: { ...inWindow, paymentStatus: 'PAID' },
  })
  check('distinct buyers', sales.buyers, buyerGroups.length)

  /* Units sold, summed by the database over paid orders. */
  const paidIds = (
    await prisma.order.findMany({ where: { ...inWindow, paymentStatus: 'PAID' }, select: { id: true } })
  ).map((o) => o.id)
  const soldUnits = await prisma.orderItem.aggregate({
    _sum: { quantity: true }, where: { orderId: { in: paidIds } },
  })
  check('units sold', sales.unitsSold, soldUnits._sum.quantity ?? 0)

  /* Total sales: what was collected plus what is still owed, straight from
     Postgres rather than from the two figures above added together. */
  const standing = await prisma.order.aggregate({
    _sum: { total: true }, where: { ...inWindow, status: { not: 'CANCELLED' } },
  })
  const standingPaid = await prisma.order.aggregate({
    _sum: { total: true }, where: { ...inWindow, status: 'CANCELLED', paymentStatus: 'PAID' },
  })
  // Orders that stand, plus any cancelled ones whose money was still taken.
  check(
    'TOTAL SALES (collected + outstanding)',
    sales.netSales,
    (standing._sum.total ?? 0) + (standingPaid._sum.total ?? 0)
  )
  check(
    'total sales orders',
    sales.netSalesOrders,
    (await prisma.order.count({ where: { ...inWindow, status: { not: 'CANCELLED' } } })) +
      (await prisma.order.count({ where: { ...inWindow, status: 'CANCELLED', paymentStatus: 'PAID' } }))
  )
  check('IDENTITY placed = total sales + lost', sales.placedAmount,
    sales.netSales + (sales.cancelledAmount - sales.refundDue))

  /* The books must balance: everything placed is either banked, still owed, or
     cancelled-and-never-paid. Cancelled-but-paid sits in both `collected` and
     `cancelledAmount` on purpose, so it is subtracted once here. */
  const balance = sales.collected + sales.outstanding + (sales.cancelledAmount - sales.refundDue)
  check('IDENTITY placed = collected + outstanding + lost', sales.placedAmount, balance)

  /* Inventory. */
  const liveOrders = allOrders.filter((o) => o.status !== 'CANCELLED' && o.status !== 'DELIVERED')
  const inventory = summariseInventory(products, liveOrders as AnalyticsOrder[])

  const sellable = await prisma.productVariant.aggregate({ _sum: { stock: true } })
  check('inventory: total sellable', inventory.totalSellable, sellable._sum.stock ?? 0)

  const liveIds = liveOrders.map((o) => o.id)
  const reserved = await prisma.orderItem.aggregate({
    _sum: { quantity: true }, where: { orderId: { in: liveIds } },
  })
  check('inventory: total reserved', inventory.totalReserved, reserved._sum.quantity ?? 0)

  const zeroProducts = products.filter(
    (p) => p.variants.reduce((s, v) => s + v.stock, 0) === 0
  ).length
  check('inventory: out of stock products', inventory.outOfStockCount, zeroProducts)

  // Per-size totals must add back up to the product's sellable figure.
  let sizeMismatch = 0
  for (const row of inventory.products) {
    const fromSizes = Object.values(row.bySize).reduce((s, n) => s + n, 0)
    if (Math.abs(fromSizes - row.sellable) > 0) sizeMismatch += 1
  }
  check('inventory: per-size totals reconcile', sizeMismatch, 0)

  /* Customers. */
  const productTitles = new Map(products.map((p) => [p.id, p.titleAr || p.titleEn]))
  const customers = summariseCustomers(
    periodOrders as AnalyticsOrder[], allOrders as AnalyticsOrder[], productTitles
  )
  const spendInPeriod = customers.reduce((s, c) => s + c.spend, 0)
  check('customers: period spend sums to collected', spendInPeriod, sales.collected)

  const knownCustomers = await prisma.order.groupBy({ by: ['userId'] })
  check('customers: rows == everyone who ever ordered', customers.length, knownCustomers.length)

  /* Best sellers must account for exactly the units sold. */
  const top = summariseTopProducts(periodOrders as AnalyticsOrder[], productTitles)
  check('top products: units sum to units sold', top.reduce((s, r) => s + r.units, 0), sales.unitsSold)
}

async function main() {
  const now = new Date()
  for (const key of ['1m', '3m', '6m', '12m'] as PeriodKey[]) {
    await verifyPeriod(parsePeriod(key), now)
  }
  console.log(
    failures === 0
      ? '\nALL CHECKS PASSED — every figure agrees with an independent query.'
      : `\n${failures} CHECK(S) FAILED.`
  )
  if (failures > 0) process.exitCode = 1
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
