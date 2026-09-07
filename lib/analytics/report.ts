import { DEFAULT_USD_TO_IQD_RATE } from '@/lib/currency'
import { compareSizes, type SizeSystem } from '@/lib/products/sizes'

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
  priceIqd: number
  size: string | null
  color: string | null
}

export interface AnalyticsOrder {
  id: string
  userId: string
  total: number
  /**
   * The dinar total, stored — not the dollar one at a rate.
   *
   * Every money figure the dashboard shows is in dinars, and it used to reach
   * them by multiplying. Now that a product carries a dinar price the shop set
   * itself, converting would report a number the shop never charged.
   */
  totalIqd: number
  discount: number
  discountIqd: number
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
  images: string[]
  sizes: string[]
  /**
   * Which run those sizes belong to.
   *
   * Needed only so the stock tables can SORT them. Without it they fell back to
   * localeCompare, which lists the letter run as L, M, M/L, S, XL, XL/XXL, XS,
   * XS/S — the restock table is read down the size column, so that ordering
   * makes it unreadable for exactly the products it was added for.
   */
  sizeSystem?: SizeSystem
  colors: string[]
  /** The shop's chosen swatch per colour name, for the stock tables. */
  colorHex?: unknown
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

/**
 * ALL MONEY HERE IS WHOLE DINARS.
 *
 * The dashboard reports in dinars and used to get there by multiplying a dollar
 * figure by the rate. Products now carry a dinar price the shop set itself and
 * orders store the dinar total actually charged, so converting would report a
 * number nobody was ever billed. Reading the stored dinars makes every figure
 * on the page reconcile with the orders table by construction.
 */
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
    const total = money(o.totalIqd)
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
      discounts += money(o.discountIqd)
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

/**
 * WHAT A CUSTOMER IS, BY HOW OFTEN THEY HAVE BOUGHT.
 *
 *   0 paid orders   new        — they have an account and have never bought
 *   1               purchased  — one completed purchase
 *   2-4             repeat     — buying again
 *   5 or more       vip
 *
 * Plus one override: a SINGLE invoice at or above VIP_INVOICE_IQD makes them
 * vip whatever the count. Someone who spends that much once is not a one-off in
 * any sense the shop cares about, and waiting for a fifth order to say so is
 * the wrong way round.
 *
 * The threshold is an INVOICE, not a lifetime total — five orders of 30,000
 * each is a repeat customer, one order of 150,000 is not the same thing. It is
 * held in dinars because that is the number the shop quoted, and converted to
 * dinars directly. Nothing here converts: the invoice is stored in the currency
 * the threshold is written in, so the two are the same kind of number.
 *
 * ADMIN ONLY. Nothing on the storefront reads a tier — a shopper being labelled
 * to their face is a different product decision, and not one that was asked for.
 */
export const VIP_ORDERS = 5
export const REPEAT_ORDERS = 2
export const VIP_INVOICE_IQD = 150_000

export type CustomerTier = 'vip' | 'repeat' | 'purchased' | 'new'

/**
 * Which tier a customer falls in.
 *
 * Pure and exported so the rule can be checked directly, without a database or
 * a page — this is the kind of ladder that goes wrong silently at a boundary.
 *
 * @param paidOrders   Completed purchases, all-time.
 * @param largestPaid  Their biggest single paid invoice, in the stored currency.
 */
export function customerTier(
  paidOrders: number,
  /** Their biggest single paid invoice, IN DINARS. */
  largestPaidIqd: number
): CustomerTier {
  // Compared directly against the threshold — no rate. The invoice is stored in
  // dinars now, so a 150,000 IQD order is 150,000 here rather than $100 turned
  // back into dinars, which could land a few dinars either side of the line and
  // decide someone's tier on a rounding artefact.
  //
  // The override needs a purchase to override FROM. Guarded rather than
  // assumed: `largestPaidIqd` is only ever built from paid orders, so zero
  // orders means zero here in practice — but this is exported and pure, and a
  // caller passing lifetime spend by mistake would otherwise make a customer
  // who has never bought anything the shop's most valuable one.
  if (paidOrders >= 1 && largestPaidIqd >= VIP_INVOICE_IQD) return 'vip'
  if (paidOrders >= VIP_ORDERS) return 'vip'
  if (paidOrders >= REPEAT_ORDERS) return 'repeat'
  if (paidOrders >= 1) return 'purchased'
  return 'new'
}

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
  /** Completed purchases, all-time — what the tier ladder is judged on. */
  lifetimePaidOrders: number
  /** Their single biggest paid invoice, which can promote them on its own. */
  largestPaidOrder: number
  /**
   * Nothing from them inside the selected window, though they have bought
   * before.
   *
   * A FLAG, not a tier. It used to overwrite the tier, so a customer who spends
   * heavily and then goes quiet stopped reading as valuable at the exact moment
   * that mattered most. The two answer different questions — what they are
   * worth, and whether they are still around — and a campaign list wants both.
   */
  inactive: boolean
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

/** A registered customer, for the ones who have never placed an order. */
export interface RegisteredCustomer {
  id: string
  name: string | null
  email: string
  phone: string | null
}

/**
 * @param periodOrders Orders placed inside the window.
 * @param allOrders    Every order ever, for lifetime figures and last-seen.
 * @param neverOrdered Registered customers with no order at all. Without them
 *   "new" is a tier nobody can hold: every row came from an order, so the only
 *   way to be new was to place one and never pay. The people who signed up and
 *   have not bought yet — the ones actually worth a first-purchase nudge — were
 *   missing from the page entirely.
 */
export function summariseCustomers(
  periodOrders: readonly AnalyticsOrder[],
  allOrders: readonly AnalyticsOrder[],
  productTitles: ReadonlyMap<string, string>,
  neverOrdered: readonly RegisteredCustomer[] = []
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
        lifetimePaidOrders: 0, largestPaidOrder: 0,
        inactive: false,
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
      row.lifetimeSpend += money(o.totalIqd)
      row.lifetimePaidOrders += 1
      row.largestPaidOrder = Math.max(row.largestPaidOrder, money(o.totalIqd))
      lifetimePaid.set(o.userId, (lifetimePaid.get(o.userId) ?? 0) + 1)
      let seen = boughtProducts.get(o.userId)
      if (!seen) boughtProducts.set(o.userId, (seen = new Set()))
      for (const item of o.items) seen.add(item.productId)
    }
  }

  // Seeded after the order pass so a stale list can never blank out a real
  // customer's figures: anyone who turns up here AND has an order keeps the
  // row the orders built.
  for (const u of neverOrdered) {
    if (rows.has(u.id)) continue
    rows.set(u.id, {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      orders: 0, paidOrders: 0, cancelledOrders: 0, spend: 0,
      lifetimeOrders: 0, lifetimeSpend: 0, lifetimeCancelled: 0,
      lifetimePaidOrders: 0, largestPaidOrder: 0,
      // Never active, so never INactive — that flag means "went quiet", and
      // someone who has not started cannot have stopped.
      inactive: false,
      completionRate: 0,
      lastOrderAt: null,
      products: [],
      tier: 'new',
    })
  }

  const inPeriod = new Set<string>()
  for (const o of periodOrders) {
    const row = ensure(o)
    row.orders += 1
    inPeriod.add(o.userId)
    if (isPaid(o)) {
      row.paidOrders += 1
      row.spend += money(o.totalIqd)
    }
    if (isCancelled(o)) row.cancelledOrders += 1
  }

  for (const row of rows.values()) {
    row.completionRate =
      row.lifetimeOrders > 0 ? (lifetimePaid.get(row.id) ?? 0) / row.lifetimeOrders : 0

    row.products = [...(boughtProducts.get(row.id) ?? [])]
      .map((id) => productTitles.get(id) ?? id)
      .sort()

    // Judged on ALL-TIME behaviour, so a good customer does not stop being one
    // because the window happens to be short.
    row.tier = customerTier(row.lifetimePaidOrders, row.largestPaidOrder)

    // Separately: are they still around? Period-relative on purpose — "bought
    // before, nothing in this window" is exactly the campaign list.
    row.inactive = !inPeriod.has(row.id) && row.lifetimeOrders > 0
  }

  return [...rows.values()].sort((a, b) => b.lifetimeSpend - a.lifetimeSpend)
}

/* ── Inventory ──────────────────────────────────────────────────────────── */

export interface InventoryRow {
  id: string
  titleAr: string
  titleEn: string
  isActive: boolean
  /** First photo, so the row can be recognised at a glance rather than read. */
  image: string | null
  /** Units the shop can still sell — the variant rows, which are already net
   *  of anything reserved by a live order. */
  sellable: number
  /** Units held by orders that are neither delivered nor cancelled. */
  reserved: number
  /** What is physically in the room: sellable + reserved. */
  onHand: number
  /** Sellable units per size, summed across colours. */
  bySize: Record<string, number>
  /**
   * Sellable units per colour, summed across sizes.
   *
   * "60 available" answered how many but never of what: a shop reading it could
   * not tell sixty of one colour from twenty of each. Ordered by the colours the
   * product is sold in, so a colour that has run out still appears, at zero.
   */
  byColor: Record<string, number>
  /** Sellable units per size and colour. */
  byPair: Array<{ size: string; color: string; stock: number }>
  /** Passed through so the table can sort sizes in their own run's order. */
  sizeSystem: SizeSystem
  /** Passed through so a custom colour renders as itself, not a grey dot. */
  colorHex?: unknown
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
    const byColor: Record<string, number> = {}
    for (const color of p.colors ?? []) byColor[color] = 0
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
      byColor[v.color] = (byColor[v.color] ?? 0) + stock
      byPair.push({ size: v.size, color: v.color, stock })
    }

    const system = p.sizeSystem ?? 'NUMERIC'
    byPair.sort(
      (a, b) => compareSizes(a.size, b.size, system) || a.color.localeCompare(b.color)
    )

    const reserved = reservedByProduct.get(p.id) ?? 0

    return {
      sizeSystem: system,
      colorHex: p.colorHex ?? null,
      id: p.id,
      titleAr: p.titleAr,
      titleEn: p.titleEn,
      isActive: p.isActive,
      image: p.images?.[0] ?? null,
      sellable,
      reserved,
      onHand: sellable + reserved,
      bySize,
      byColor,
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
  image: string | null
  units: number
  revenue: number
}

/**
 * Units and money per product, from PAID orders only.
 *
 * @param productImages First photo per product, so a best-seller is recognised
 *   at a glance. A product deleted since the sale simply has none — the line
 *   still counts, because it still earned.
 */
export function summariseTopProducts(
  orders: readonly AnalyticsOrder[],
  productTitles: ReadonlyMap<string, string>,
  productImages?: ReadonlyMap<string, string | null>
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
          image: productImages?.get(item.productId) ?? null,
          units: 0,
          revenue: 0,
        }
        rows.set(item.productId, row)
      }
      const quantity = Number(item.quantity) || 0
      row.units += quantity
      // The price CHARGED on the line, not today's price — a shoe discounted
      // since the sale must not restate what it earned.
      row.revenue += quantity * money(item.priceIqd)
    }
  }

  return [...rows.values()].sort((a, b) => b.units - a.units)
}
