/**
 * Catalogue integrity — the companion to verify-analytics.ts.
 *
 * verify-analytics proves the DASHBOARD adds up. This proves the CATALOGUE
 * underneath it is coherent: that every product's sizes, colours, per-pair
 * stock and per-colour photos agree with each other, and that no order line
 * points at a pair that no longer exists.
 *
 * These three lists used to be independent columns that only happened to line
 * up. Sizes and colours live on Product, stock lives on ProductVariant keyed by
 * (size, colour), and photos live on ProductColorImage keyed by colour — so
 * they can drift apart silently, and every way they can is checked here.
 *
 * Read-only. Exits non-zero if anything is wrong, so it can gate a deploy.
 *
 *   npx tsx prisma/verify-catalogue.ts
 */
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { sizesForSystem } from '../lib/products/sizes'

config({ path: '.env.local' })
config({ path: '.env' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

/**
 * Separator for the composite (size, colour) keys below.
 *
 * NUL rather than a space or a slash, because a colour name may contain either
 * and two different pairs must never collapse to the same key. Built with a
 * function call so no literal control character appears in this source.
 */
const SEP = String.fromCharCode(0)

type Problem = { product: string; issue: string }
const problems: Problem[] = []
const note = (product: string, issue: string) => problems.push({ product, issue })

/**
 * Retired products are held to a weaker standard on purpose.
 *
 * An inactive product is off the storefront, so an incoherence in it cannot
 * hurt a shopper today — but it becomes a live fault the moment someone ticks
 * "active" in the dashboard. Reporting it as a warning says both things: it is
 * not on fire, and it is not ready to come back.
 */
const warnings: Problem[] = []
const warn = (product: string, issue: string) => warnings.push({ product, issue })

/**
 * Damage that predates per-variant inventory and cannot be repaired by code.
 *
 * An order placed when size and colour were optional records neither, so there
 * is no way to know which pair to credit if it is ever cancelled — and guessing
 * one would be inventing a fact about a real customer's purchase. It is listed
 * every run so it stays visible, but it does not fail the gate: it is
 * permanent, and a gate that can never go green is a gate everyone ignores.
 */
const legacy: Problem[] = []
const old = (product: string, issue: string) => legacy.push({ product, issue })

async function main() {
  const products = await prisma.product.findMany({
    select: {
      slug: true,
      titleAr: true,
      isActive: true,
      sizes: true,
      colors: true,
      sizeSystem: true,
      price: true,
      priceIqd: true,
      salePrice: true,
      salePriceIqd: true,
      images: true,
      variants: { select: { size: true, color: true, stock: true } },
      colorImages: { select: { color: true, images: true } },
    },
    orderBy: { slug: 'asc' },
  })

  let variantRows = 0
  let sellable = 0

  for (const p of products) {
    const sizes = p.sizes ?? []
    const colors = p.colors ?? []
    variantRows += p.variants.length

    // A product with no size or no colour cannot have a variant, so it cannot
    // be bought at all — it renders but every add-to-cart fails. Retired
    // products get a warning instead: nobody can reach them, but they are not
    // fit to be switched back on either.
    const flag = p.isActive ? note : warn
    if (sizes.length === 0) flag(p.slug, 'has no sizes — nothing can be bought')
    if (colors.length === 0) flag(p.slug, 'has no colours — nothing can be bought')

    // 1. Every (size, colour) pair the product claims must have a row. A
    //    missing row is not "0 in stock" — the conditional stock claim matches
    //    nothing, so the size looks orderable and then silently refuses.
    const have = new Set(p.variants.map((v) => `${v.size}${SEP}${v.color}`))
    for (const size of sizes) {
      for (const color of colors) {
        if (!have.has(`${size}${SEP}${color}`)) {
          flag(p.slug, `no variant row for (${size} / ${color})`)
        }
      }
    }

    // 2. The reverse: a row for a pair the product no longer sells. Its units
    //    are counted as sellable stock that nothing can ever put in a basket.
    for (const v of p.variants) {
      if (!sizes.includes(v.size)) {
        note(p.slug, `variant (${v.size} / ${v.color}) has a size the product does not sell`)
      }
      if (!colors.includes(v.color)) {
        note(p.slug, `variant (${v.size} / ${v.color}) has a colour the product does not sell`)
      }
      if (v.stock < 0) {
        note(p.slug, `variant (${v.size} / ${v.color}) has NEGATIVE stock ${v.stock}`)
      }
      sellable += Math.max(0, v.stock)
    }

    // 3. Sizes must belong to the declared run. A LETTER product carrying "38"
    //    sorts by the numeric comparator and renders in the wrong place, and a
    //    NUMERIC one carrying "M/L" is off the 35-41 ladder entirely.
    if (p.sizeSystem === 'NUMERIC') {
      const ladder = sizesForSystem('NUMERIC')
      for (const size of sizes) {
        if (!ladder.includes(size)) {
          note(p.slug, `NUMERIC product carries "${size}", which is not on the 35-41 ladder`)
        }
      }
    } else {
      for (const size of sizes) {
        if (/^\d+$/.test(String(size))) {
          note(p.slug, `LETTER product carries the numeric size "${size}"`)
        }
      }
    }

    // 4. Photos filed under a colour the product does not sell are unreachable:
    //    no swatch selects them, so the gallery can never show them.
    for (const ci of p.colorImages) {
      if (!colors.includes(ci.color)) {
        note(p.slug, `photos filed under colour "${ci.color}", which the product does not sell`)
      }
      if ((ci.images ?? []).length === 0) {
        note(p.slug, `empty photo row for colour "${ci.color}"`)
      }
    }

    // 5. Every photographed colour's images must appear in the derived gallery,
    //    which is what the card and the listing read. This is the invariant the
    //    data-loss bug broke: deriving the gallery REPLACED it instead of
    //    merging, so colours that had no photos of their own started showing
    //    another colour's.
    const gallery = new Set(p.images ?? [])
    for (const ci of p.colorImages) {
      for (const img of ci.images ?? []) {
        if (!gallery.has(img)) {
          note(p.slug, `colour "${ci.color}" has a photo missing from the product gallery`)
        }
      }
    }

    // An active product with no photo at all renders as a broken card.
    if (p.isActive && (p.images ?? []).length === 0) {
      note(p.slug, 'is active but has no images')
    }

    // 7. Both prices must exist and be sane. They are set independently, so
    //    neither can be recovered from the other — a product missing its dinar
    //    price cannot be sold to an Iraqi shopper at all, and a zero would be a
    //    free product with real stock behind it.
    if (!(p.price > 0)) note(p.slug, `has no dollar price (${p.price})`)
    if (!(p.priceIqd > 0)) note(p.slug, `has no dinar price (${p.priceIqd})`)
    if (!Number.isInteger(p.priceIqd)) {
      note(p.slug, `dinar price ${p.priceIqd} is not a whole number`)
    }

    // A sale price must be a real discount IN ITS OWN CURRENCY. Checking one
    // against the other would compare two unrelated numbers.
    if (p.salePrice != null && !(p.salePrice > 0 && p.salePrice < p.price)) {
      note(p.slug, `dollar sale price ${p.salePrice} is not a discount on ${p.price}`)
    }
    if (
      p.salePriceIqd != null &&
      !(p.salePriceIqd > 0 && p.salePriceIqd < p.priceIqd)
    ) {
      note(
        p.slug,
        `dinar sale price ${p.salePriceIqd} is not a discount on ${p.priceIqd}`
      )
    }

    // The two currencies must agree about WHETHER the product is on sale, even
    // though they need not agree on how much. A product discounted in dinars
    // but not in dollars shows a SALE badge to one shopper and not the other.
    const onSaleUsd = p.salePrice != null && p.salePrice < p.price
    const onSaleIqd = p.salePriceIqd != null && p.salePriceIqd < p.priceIqd
    if (onSaleUsd !== onSaleIqd) {
      // `flag`, not `warn`. This is a live shopper-facing discrepancy on an
      // active product — the SALE badge appears for one currency and not the
      // other — so it must fail the gate. Filing it under `warn` put it in the
      // "retired products, unreachable by shoppers" bucket, which does not set
      // the exit code, so the one cross-currency check here reported a real
      // fault and still printed ALL CHECKS PASSED.
      flag(
        p.slug,
        `on sale in ${onSaleUsd ? 'dollars' : 'dinars'} but not in ${onSaleUsd ? 'dinars' : 'dollars'} — the sale badge differs by currency`
      )
    }
  }

  // 6. Order lines must still resolve to a real pair, otherwise cancelling that
  //    order cannot return its units anywhere (releaseOrderStock warns and the
  //    shop goes quietly short).
  const items = await prisma.orderItem.findMany({
    select: {
      quantity: true,
      size: true,
      color: true,
      product: { select: { slug: true } },
      order: { select: { id: true, status: true } },
    },
  })
  const pairs = new Set<string>()
  for (const p of products) {
    for (const v of p.variants) pairs.add(`${p.slug}${SEP}${v.size}${SEP}${v.color}`)
  }
  let unreturnable = 0
  for (const it of items) {
    const slug = it.product?.slug ?? '(deleted product)'
    if (!it.size || !it.color) {
      if (it.order.status !== 'CANCELLED') {
        unreturnable += it.quantity
        // Pre-migration: nothing to repair, so it does not fail the gate. The
        // line below, by contrast, IS the shop's doing — a size or colour was
        // retired while an open order still needed it — and stays an error
        // because restoring the pair fixes it.
        old(slug, `order ${it.order.id}: line records no size/colour — ${it.quantity} unit(s) could not be returned if cancelled`)
      }
      continue
    }
    if (!pairs.has(`${slug}${SEP}${it.size}${SEP}${it.color}`)) {
      if (it.order.status !== 'CANCELLED') {
        unreturnable += it.quantity
        note(slug, `order ${it.order.id}: line (${it.size} / ${it.color}) no longer exists — ${it.quantity} unit(s) could not be returned if cancelled`)
      }
    }
  }

  // 8. A fixed-amount coupon has a DOLLAR value and no dinar twin, so its dinar
  //    discount is the one figure still reached through the rate. None exist
  //    today; this fails loudly if one is ever created, rather than letting a
  //    converted discount quietly reappear in the charge path.
  const fixedCoupons = await prisma.coupon.findMany({
    where: { type: { not: 'PERCENT' } },
    select: { code: true, value: true },
  })
  for (const c of fixedCoupons) {
    note(
      `coupon ${c.code}`,
      `is a fixed-amount coupon ($${c.value}) with no dinar value — its dinar discount is converted at the rate. Give it a dinar amount or make it a percentage.`
    )
  }

  // 9. minSubtotal and maxDiscount are DOLLAR gates. The dinar basket is summed
  //    from independent dinar prices, so a gate of $50 does not correspond to
  //    any particular dinar basket — the shopper is shown one threshold in
  //    dinars and judged against another in dollars. None are set today.
  const gatedCoupons = await prisma.coupon.findMany({
    where: { OR: [{ minSubtotal: { not: null } }, { maxDiscount: { not: null } }] },
    select: { code: true, minSubtotal: true, maxDiscount: true },
  })
  for (const c of gatedCoupons) {
    note(
      `coupon ${c.code}`,
      `has a dollar threshold (minSubtotal=${c.minSubtotal}, maxDiscount=${c.maxDiscount}) judged against a basket whose dinar total is set independently — the shopper is shown one figure and gated on another.`
    )
  }

  const bySystem = products.reduce<Record<string, number>>((acc, p) => {
    acc[p.sizeSystem] = (acc[p.sizeSystem] ?? 0) + 1
    return acc
  }, {})

  console.log('CATALOGUE')
  console.log(`  products            ${products.length} (${products.filter((p) => p.isActive).length} active)`)
  console.log(`  size systems        ${Object.entries(bySystem).map(([k, v]) => `${k}=${v}`).join('  ')}`)
  console.log(`  variant rows        ${variantRows}`)
  console.log(`  sellable units      ${sellable}`)
  console.log(`  photographed colours ${products.reduce((n, p) => n + p.colorImages.length, 0)}`)
  console.log(`  order lines         ${items.length}`)
  console.log(`  unreturnable units  ${unreturnable}`)
  console.log()

  if (legacy.length > 0) {
    console.log(`${legacy.length} PRE-MIGRATION LINE(S) — not repairable in code, fix by hand if ever cancelled:`)
    for (const l of legacy) console.log(`  ${l.product.padEnd(28)} ${l.issue}`)
    console.log()
  }

  if (warnings.length > 0) {
    console.log(`${warnings.length} WARNING(S) — retired products, unreachable by shoppers:`)
    for (const w of warnings) console.log(`  ${w.product.padEnd(28)} ${w.issue}`)
    console.log()
  }

  if (problems.length === 0) {
    console.log('ALL CHECKS PASSED — sizes, colours, stock, photos and order lines all agree.')
    return
  }

  console.log(`${problems.length} PROBLEM(S):`)
  for (const p of problems) console.log(`  ${p.product.padEnd(28)} ${p.issue}`)
  process.exitCode = 1
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
