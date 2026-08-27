/**
 * Dashboard analytics.
 *
 * Pure functions over plain rows, deliberately: every figure the analytics page
 * shows can then be recomputed and checked without a database, a request, or a
 * browser — which is the only way to be sure a reported number is the number.
 *
 * THREE RULES DECIDE EVERY FIGURE HERE, and they are the rules the rest of this
 * codebase already follows:
 *
 * 1. MONEY IS `paymentStatus`, NEVER `status`. `Order.status` is the delivery
 *    lifecycle; an order can be CONFIRMED for weeks without a dinar arriving.
 *    Reporting "sales" from placed orders overstated this shop's revenue by
 *    3.8x once already (see app/api/dashboard/stats/route.ts).
 *
 * 2. THE PERIOD AXIS IS `createdAt` — when the order was PLACED. Every figure on
 *    the page therefore describes the same set of orders and adds up against
 *    the orders table. Reporting revenue by `paidAt` while counting orders by
 *    `createdAt` would be defensible on its own but the two would not
 *    reconcile, and a page whose halves disagree is worse than a slightly
 *    coarser one. The page says which axis it uses.
 *
 * 3. A SALE IS A PAID ORDER. Units sold, customer spend and best-sellers all
 *    count PAID orders only. A cancelled order sold nothing; a confirmed one
 *    has not sold anything YET.
 */

export type PeriodKey = '1m' | '3m' | '6m' | '12m'

export const PERIOD_MONTHS: Record<PeriodKey, number> = {
  '1m': 1,
  '3m': 3,
  '6m': 6,
  '12m': 12,
}

export const PERIODS = Object.keys(PERIOD_MONTHS) as PeriodKey[]

export function parsePeriod(value: unknown): PeriodKey {
  return PERIODS.includes(value as PeriodKey) ? (value as PeriodKey) : '1m'
}

/** Start of the window, counted back in whole months from `now`. */
export function periodStart(key: PeriodKey, now: Date): Date {
  const start = new Date(now)
  start.setMonth(start.getMonth() - PERIOD_MONTHS[key])
  return start
}

/* ── Row shapes ─────────────────────────────────────────────────────────── */

export interface AnalyticsItem {
  productId: string
  quantity: number
  price: number
  size: string | null
  color: string | null
}

export interface AnalyticsOrder {
  id: string
  userId: string
  total: number
  discount: number
  status: string
  paymentStatus: string
  paymentMethod: string
  createdAt: Date | string
  items: AnalyticsItem[]
  user?: { id: string; name: string | null; email: string; phone: string | null } | null
}

export interface AnalyticsVariant {
  size: string
  color: string
  stock: number
}

export interface AnalyticsProduct {
  id: string
  titleAr: string
  titleEn: string
  isActive: boolean
  sizes: string[]
  variants: AnalyticsVariant[]
}

const isPaid = (o: AnalyticsOrder) => o.paymentStatus === 'PAID'
const isCancelled = (o: AnalyticsOrder) => o.status === 'CANCELLED'
const unitsOf = (o: AnalyticsOrder) =>
  o.items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)
const money = (v: unknown) => Number(v) || 0

/* ── Sales ──────────────────────────────────────────────────────────────── */

export interface MethodBreakdown {
  placed: number
  placedAmount: number
  paid: number
  paidAmount: number
  outstanding: number
  outstandingAmount: number
  cancelled: number
  cancelledAmount: number
  /** Online only: the payer never finished. */
  failed: number
  expired: number
}

function emptyMethod(): MethodBreakdown {
  return {
    placed: 0, placedAmount: 0,
    paid: 0, paidAmount: 0,
    outstanding: 0, outstandingAmount: 0,
    cancelled: 0, cancelledAmount: 0,
    failed: 0, expired: 0,
  }
}

export function summariseSales(orders: readonly AnalyticsOrder[]) {
  const byMethod: Record<string, MethodBreakdown> = {
    COD: emptyMethod(),
    WAYLE: emptyMethod(),
  }

  let collected = 0, collectedOrders = 0
  let outstanding = 0, outstandingOrders = 0
  let refundDue = 0, refundDueOrders = 0
  let cancelledAmount = 0, cancelledOrders = 0
  let discounts = 0
  let placedAmount = 0
  let unitsSold = 0

  const buyers = new Set<string>()

  for (const o of orders) {
    const total = money(o.total)
    const method = byMethod[o.paymentMethod] ?? (byMethod[o.paymentMethod] = emptyMethod())

    placedAmount += total
    method.placed += 1
    method.placedAmount += total

    if (isPaid(o)) {
      // Banked. Counted even if the order was later cancelled — the money did
      // arrive, and hiding it would make the page disagree with the bank. What
      // is owed back shows separately as refundDue.
      collected += total
      collectedOrders += 1
      buyers.add(o.userId)
      unitsSold += unitsOf(o)
      method.paid += 1
      method.paidAmount += total
    }

    if (isCancelled(o)) {
      cancelledAmount += total
      cancelledOrders += 1
      method.cancelled += 1
      method.cancelledAmount += total
      if (isPaid(o)) {
        refundDue += total
        refundDueOrders += 1
      }
    } else {
      // Live and unpaid: invoiced, not collected. For a cash-on-delivery shop
      // this is money out with drivers.
      if (!isPaid(o)) {
        outstanding += total
        outstandingOrders += 1
        method.outstanding += 1
        method.outstandingAmount += total
      }
      // A discount on a cancelled order cost the shop nothing.
      discounts += money(o.discount)
    }

    if (o.paymentStatus === 'FAILED') method.failed += 1
    if (o.paymentStatus === 'EXPIRED') method.expired += 1
  }

  /**
   * TOTAL SALES: the orders that stand.
   *
   * Collected plus still owed — money that has arrived and money that is going
   * to. Cancelled orders are excluded because they sold nothing; they are
   * reported beside this as what was lost, and the two add back up to
   * everything placed:
   *
   *     placed = netSales + (cancelled - refundDue)
   *
   * The page showed the two halves without ever showing the sum, which left
   * "what did I sell this month" as a question the shop had to do in its head.
   */
  const netSales = collected + outstanding

  return {
    placedOrders: orders.length,
    placedAmount,
    netSales,
    netSalesOrders: collectedOrders + outstandingOrders,
    collected, collectedOrders,
    outstanding, outstandingOrders,
    refundDue, refundDueOrders,
    cancelledAmount, cancelledOrders,
    discounts,
    unitsSold,
    buyers: buyers.size,
    byMethod,
  }
}

/* ── Customers ──────────────────────────────────────────────────────────── */

/** Spend at or above this (USD, all-time) makes a customer VIP. */
export const VIP_SPEND = 100
/** Two or more paid orders makes a customer a repeat buyer. */
export const REPEAT_ORDERS = 2

export type CustomerTier = 'vip' | 'repeat' | 'new' | 'inactive'

export interface CustomerRow {
  id: string
  name: string | null
  email: string
  phone: string | null
  /** Orders placed in the selected period. */
  orders: number
  /** Of those, the ones actually paid for. */
  paidOrders: number
  /**
   * Of those, the ones that were cancelled.
   *
   * The sales figures report money lost to cancellations but said nothing about
   * WHOSE — a shop looking at six abandoned orders could not tell whether that
   * was one customer with a habit or six unlucky ones, which are opposite
   * problems.
   */
  cancelledOrders: number
  /** Money collected from them in the period. */
  spend: number
  /** All-time totals, which is what tiers are judged on. */
  lifetimeOrders: number
  lifetimeSpend: number
  lifetimeCancelled: number
  /**
   * Share of their orders that were actually paid for, all-time, 0-1.
   *
   * Reported rather than judged: a low rate on two orders means far less than
   * the same rate on twenty, so the page shows the counts beside it.
   */
  completionRate: number
  /** All-time, never period-limited: "when did they last buy from us". */
  lastOrderAt: Date | null
  /** Distinct products they have actually paid for, all-time. */
  products: string[]
  tier: CustomerTier
}

/**
 * @param periodOrders Orders placed inside the window.
 * @param allOrders    Every order ever, for lifetime figures and last-seen.
 */
export function summariseCustomers(
  periodOrders: readonly AnalyticsOrder[],
  allOrders: readonly AnalyticsOrder[],
  productTitles: ReadonlyMap<string, string>
): CustomerRow[] {
  const rows = new Map<string, CustomerRow>()

  const ensure = (o: AnalyticsOrder): CustomerRow => {
    let row = rows.get(o.userId)
    if (!row) {
      row = {
        id: o.userId,
        name: o.user?.name ?? null,
        email: o.user?.email ?? '',
        phone: o.user?.phone ?? null,
        orders: 0, paidOrders: 0, cancelledOrders: 0, spend: 0,
        lifetimeOrders: 0, lifetimeSpend: 0, lifetimeCancelled: 0,
        completionRate: 0,
        lastOrderAt: null,
        products: [],
        tier: 'new',
      }
      rows.set(o.userId, row)
    }
    // A later order may carry contact details an earlier one lacked.
    if (!row.name && o.user?.name) row.name = o.user.name
    if (!row.email && o.user?.email) row.email = o.user.email
    if (!row.phone && o.user?.phone) row.phone = o.user.phone
    return row
  }

  const boughtProducts = new Map<string, Set<string>>()

  const lifetimePaid = new Map<string, number>()

  for (const o of allOrders) {
    const row = ensure(o)
    row.lifetimeOrders += 1
    if (isCancelled(o)) row.lifetimeCancelled += 1

    const placedAt = new Date(o.createdAt)
    if (!row.lastOrderAt || placedAt > row.lastOrderAt) row.lastOrderAt = placedAt

    if (isPaid(o)) {
      row.lifetimeSpend += money(o.total)
      lifetimePaid.set(o.userId, (lifetimePaid.get(o.userId) ?? 0) + 1)
      let seen = boughtProducts.get(o.userId)
      if (!seen) boughtProducts.set(o.userId, (seen = new Set()))
      for (const item of o.items) seen.add(item.productId)
    }
  }

  const inPeriod = new Set<string>()
  for (const o of periodOrders) {
    const row = ensure(o)
    row.orders += 1
    inPeriod.add(o.userId)
    if (isPaid(o)) {
      row.paidOrders += 1
      row.spend += money(o.total)
    }
    if (isCancelled(o)) row.cancelledOrders += 1
  }

  for (const row of rows.values()) {
    row.completionRate =
      row.lifetimeOrders > 0 ? (lifetimePaid.get(row.id) ?? 0) / row.lifetimeOrders : 0

    row.products = [...(boughtProducts.get(row.id) ?? [])]
      .map((id) => productTitles.get(id) ?? id)
      .sort()

    // Tiers are judged on ALL-TIME behaviour, so a good customer does not stop
    // being one because the window is short. "Inactive" is the exception and is
    // deliberately period-relative: it means "bought before, nothing from them
    // in this window", which is exactly the list to target with a campaign.
    if (row.lifetimeSpend >= VIP_SPEND) row.tier = 'vip'
    else if (row.lifetimeOrders >= REPEAT_ORDERS) row.tier = 'repeat'
    else row.tier = 'new'

    if (!inPeriod.has(row.id) && row.lifetimeOrders > 0) row.tier = 'inactive'
  }

  return [...rows.values()].sort((a, b) => b.lifetimeSpend - a.lifetimeSpend)
}

/* ── Inventory ──────────────────────────────────────────────────────────── */

export interface InventoryRow {
  id: string
  titleAr: string
  titleEn: string
  isActive: boolean
  /** Units the shop can still sell — the variant rows, which are already net
   *  of anything reserved by a live order. */
  sellable: number
  /** Units held by orders that are neither delivered nor cancelled. */
  reserved: number
  /** What is physically in the room: sellable + reserved. */
  onHand: number
  /** Sellable units per size, summed across colours. */
  bySize: Record<string, number>
  /** Sellable units per size and colour. */
  byPair: Array<{ size: string; color: string; stock: number }>
  outOfStock: boolean
  lowStock: boolean
}

/** At or below this many sellable units, a product needs restocking. */
export const LOW_STOCK = 5

export function summariseInventory(
  products: readonly AnalyticsProduct[],
  liveOrders: readonly AnalyticsOrder[]
) {
  // Units held by orders that have neither shipped nor been cancelled. Stock is
  // reserved the moment an order is placed, so these are already OUT of the
  // variant rows — counting them separately is what lets the page say what is
  // physically in the room without double-counting it as sellable.
  const reservedByProduct = new Map<string, number>()
  for (const o of liveOrders) {
    for (const item of o.items) {
      reservedByProduct.set(
        item.productId,
        (reservedByProduct.get(item.productId) ?? 0) + (Number(item.quantity) || 0)
      )
    }
  }

  const rows: InventoryRow[] = products.map((p) => {
    const bySize: Record<string, number> = {}
    // Every size the product is SOLD in gets an entry, including the ones that
    // have run out — a missing row and a zero would otherwise look the same,
    // and "which size am I out of" is the question this table exists to answer.
    for (const size of p.sizes) bySize[size] = 0

    let sellable = 0
    const byPair: InventoryRow['byPair'] = []
    for (const v of p.variants) {
      const stock = Number(v.stock) || 0
      sellable += stock
      bySize[v.size] = (bySize[v.size] ?? 0) + stock
      byPair.push({ size: v.size, color: v.color, stock })
    }

    byPair.sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true }) || a.color.localeCompare(b.color))

    const reserved = reservedByProduct.get(p.id) ?? 0

    return {
      id: p.id,
      titleAr: p.titleAr,
      titleEn: p.titleEn,
      isActive: p.isActive,
      sellable,
      reserved,
      onHand: sellable + reserved,
      bySize,
      byPair,
      outOfStock: sellable === 0,
      lowStock: sellable > 0 && sellable <= LOW_STOCK,
    }
  })

  rows.sort((a, b) => a.sellable - b.sellable)

  return {
    products: rows,
    totalSellable: rows.reduce((s, r) => s + r.sellable, 0),
    totalReserved: rows.reduce((s, r) => s + r.reserved, 0),
    outOfStockCount: rows.filter((r) => r.outOfStock).length,
    lowStockCount: rows.filter((r) => r.lowStock).length,
  }
}

/* ── Best sellers ───────────────────────────────────────────────────────── */

export interface SoldRow {
  productId: string
  title: string
  units: number
  revenue: number
}

/** Units and money per product, from PAID orders only. */
export function summariseTopProducts(
  orders: readonly AnalyticsOrder[],
  productTitles: ReadonlyMap<string, string>
): SoldRow[] {
  const rows = new Map<string, SoldRow>()

  for (const o of orders) {
    if (!isPaid(o)) continue
    for (const item of o.items) {
      let row = rows.get(item.productId)
      if (!row) {
        row = {
          productId: item.productId,
          title: productTitles.get(item.productId) ?? item.productId,
          units: 0,
          revenue: 0,
        }
        rows.set(item.productId, row)
      }
      const quantity = Number(item.quantity) || 0
      row.units += quantity
      // The price CHARGED on the line, not today's price — a shoe discounted
      // since the sale must not restate what it earned.
      row.revenue += quantity * money(item.price)
    }
  }

  return [...rows.values()].sort((a, b) => b.units - a.units)
}
