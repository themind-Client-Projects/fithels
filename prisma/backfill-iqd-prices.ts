/**
 * Fills the new dinar columns for rows written before prices were held in two
 * currencies.
 *
 * THE GUIDING RULE: nothing may change what anyone was shown or charged. Every
 * dinar figure here is the figure that was already being displayed — the USD
 * value converted at the rate that was in force — so this migration is visible
 * nowhere on the site. It moves a computed number into a stored one.
 *
 * The one place it does better than a conversion: an order paid through Wayle
 * already has the exact integer the gateway was given, on PaymentIntent. That
 * is the truth about what the customer paid, so it wins over recomputing.
 *
 * Idempotent — only rows still holding the 0/null placeholder are touched, so
 * re-running cannot overwrite a price the shop has since set by hand.
 *
 *   npx tsx prisma/backfill-iqd-prices.ts          # report only
 *   npx tsx prisma/backfill-iqd-prices.ts --write  # apply
 */
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { getDisplayRate } from '../lib/currency'

config({ path: '.env.local' })
config({ path: '.env' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

const WRITE = process.argv.includes('--write')
const RATE = getDisplayRate()

/** Exactly what formatMoney would have rendered for this USD amount. */
const toDinars = (usd: number): number => Math.round((Number(usd) || 0) * RATE)

async function main() {
  console.log(`rate ${RATE} IQD/USD`)
  console.log(WRITE ? 'MODE: writing\n' : 'MODE: dry run (pass --write to apply)\n')

  /* ── Products ─────────────────────────────────────────────────────────── */
  const products = await prisma.product.findMany({
    where: { priceIqd: 0 },
    select: { id: true, slug: true, price: true, salePrice: true, priceIqd: true },
    orderBy: { slug: 'asc' },
  })

  console.log(`PRODUCTS — ${products.length} without a dinar price`)
  for (const p of products) {
    const priceIqd = toDinars(p.price)
    const salePriceIqd = p.salePrice == null ? null : toDinars(p.salePrice)
    const sale = salePriceIqd == null ? '' : `  sale ${salePriceIqd.toLocaleString()}`
    console.log(
      `  ${p.slug.padEnd(26)} $${String(p.price).padStart(7)} -> ${priceIqd.toLocaleString().padStart(9)} IQD${sale}`
    )
    if (WRITE) {
      await prisma.product.update({
        where: { id: p.id },
        data: { priceIqd, salePriceIqd },
      })
    }
  }

  /* ── Order lines ──────────────────────────────────────────────────────── */
  const items = await prisma.orderItem.findMany({
    where: { priceIqd: 0 },
    select: { id: true, price: true },
  })
  console.log(`\nORDER LINES — ${items.length} without a dinar price`)
  if (WRITE) {
    for (const it of items) {
      await prisma.orderItem.update({
        where: { id: it.id },
        data: { priceIqd: toDinars(it.price) },
      })
    }
  }

  /* ── Orders ───────────────────────────────────────────────────────────── */
  const orders = await prisma.order.findMany({
    where: { totalIqd: 0 },
    select: {
      id: true, subtotal: true, discount: true, total: true, paymentMethod: true,
      // The exact integer Wayle was handed, where there is one.
      paymentIntent: { select: { amountIqd: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`\nORDERS — ${orders.length} without a dinar total`)
  let fromIntent = 0
  for (const o of orders) {
    const charged = o.paymentIntent?.amountIqd
    // The gateway figure is what the customer actually paid. Converting the USD
    // total again could land a dinar or two away from it, and then the order
    // would disagree with the payment attached to it.
    const totalIqd = charged && charged > 0 ? charged : toDinars(o.total)
    if (charged && charged > 0) fromIntent += 1

    const note = charged && charged > 0 ? ' (from payment intent)' : ''
    console.log(
      `  ${o.id.slice(0, 12)}  ${o.paymentMethod.padEnd(5)} $${String(o.total).padStart(8)} -> ${totalIqd.toLocaleString().padStart(9)} IQD${note}`
    )

    if (WRITE) {
      await prisma.order.update({
        where: { id: o.id },
        data: {
          totalIqd,
          subtotalIqd: toDinars(o.subtotal),
          discountIqd: toDinars(o.discount),
        },
      })
    }
  }
  console.log(`  ${fromIntent} of ${orders.length} took the exact charged figure`)

  console.log(
    WRITE
      ? '\nDone. Re-run to confirm nothing is left.'
      : '\nNothing written. Re-run with --write to apply.'
  )
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
