/**
 * Fills in per-pair stock for products that have none.
 *
 * `Product.stock` was one number for the whole shoe, so it cannot be split into
 * per-pair quantities by any rule that is actually TRUE — nineteen pairs across
 * fifteen combinations does not say which. What this does is give every product
 * a believable spread summing to the total it used to carry, so the shop starts
 * from something sensible and corrects it from the dashboard, rather than every
 * product reading as sold out.
 *
 * The spread is weighted towards the middle of the size run, because that is
 * how shoes actually sell and sit on a shelf — a shop holds more 38s and 39s
 * than 35s and 42s.
 *
 * IDEMPOTENT, and deliberately conservative: a product that already has any
 * stock recorded is left completely alone. Re-running this must never overwrite
 * counts someone has since corrected by hand.
 */
import { readFileSync } from 'node:fs'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

config({ path: '.env.local' })
config({ path: '.env' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

/** Fallback when a product has no recorded history to spread. */
const DEFAULT_TOTAL = 12

/**
 * How desirable a size is, relative to the middle of the run.
 *
 * A plain bell over the index: the middle sizes get the most, the ends the
 * least, and no size gets zero — a size the shop lists but holds none of is a
 * real state, but it should not be invented for every product at once.
 */
function sizeWeight(index: number, count: number): number {
  if (count <= 1) return 1
  const middle = (count - 1) / 2
  const spread = Math.max(1, count / 2.5)
  const distance = (index - middle) / spread
  return Math.exp(-0.5 * distance * distance)
}

/**
 * Split `total` across `weights` so the parts are whole and sum EXACTLY to it.
 *
 * Largest-remainder: floor everything, then hand the units lost to rounding to
 * whoever was closest to the next whole one. Rounding each share independently
 * would lose or invent units, and inventory that does not add up is worse than
 * inventory that is merely approximate.
 */
function distribute(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (sum <= 0 || total <= 0) return weights.map(() => 0)

  const exact = weights.map((w) => (w / sum) * total)
  const parts = exact.map((v) => Math.floor(v))
  let left = total - parts.reduce((a, b) => a + b, 0)

  const order = exact
    .map((v, i) => ({ i, fraction: v - Math.floor(v) }))
    .sort((a, b) => b.fraction - a.fraction)

  for (let k = 0; left > 0; k += 1, left -= 1) {
    parts[order[k % order.length].i] += 1
  }
  return parts
}

async function main() {
  // Totals from before the column was dropped, if the snapshot is still around.
  const snapshotPath = process.argv[2]
  const previousTotals = new Map<string, number>()
  if (snapshotPath) {
    try {
      const rows = JSON.parse(readFileSync(snapshotPath, 'utf8')) as Array<{
        id: string
        stock: number
      }>
      for (const row of rows) previousTotals.set(row.id, Number(row.stock) || 0)
      console.log(`read ${previousTotals.size} previous totals`)
    } catch {
      console.log('no usable snapshot — falling back to a default total')
    }
  }

  const products = await prisma.product.findMany({
    include: { variants: true },
  })

  let seeded = 0
  let skipped = 0

  for (const product of products) {
    const held = product.variants.reduce((sum, v) => sum + v.stock, 0)
    if (held > 0) {
      skipped += 1
      continue
    }

    const sizes = product.sizes.filter(Boolean)
    const colors = product.colors.filter(Boolean)
    if (sizes.length === 0 || colors.length === 0) {
      skipped += 1
      continue
    }

    const total = previousTotals.get(product.id) ?? DEFAULT_TOTAL

    // Weight every pair, then split the total across all of them at once so the
    // sum is exact across the whole grid rather than per colour.
    const pairs: { size: string; color: string; weight: number }[] = []
    for (const color of colors) {
      sizes.forEach((size, index) => {
        pairs.push({ size, color, weight: sizeWeight(index, sizes.length) })
      })
    }

    const quantities = distribute(total, pairs.map((p) => p.weight))

    // Replaced, not merged: reaching here means the product holds nothing, so
    // any rows present are zeroes left by an earlier save.
    await prisma.$transaction([
      prisma.productVariant.deleteMany({ where: { productId: product.id } }),
      prisma.productVariant.createMany({
        data: pairs.map((pair, i) => ({
          productId: product.id,
          size: pair.size,
          color: pair.color,
          stock: quantities[i],
        })),
      }),
    ])

    seeded += 1
    console.log(
      `  ${product.titleAr}: ${total} across ${pairs.length} pairs ` +
        `(${sizes.length} sizes x ${colors.length} colours)`
    )
  }

  console.log(`\nseeded ${seeded} products, left ${skipped} alone`)

  const grand = await prisma.productVariant.aggregate({ _sum: { stock: true } })
  console.log(`total units now: ${grand._sum.stock ?? 0}`)
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
