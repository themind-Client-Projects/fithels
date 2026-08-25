/**
 * Records the pre-variant stock numbers before the column is dropped.
 *
 * `Product.stock` was one number covering every size and colour, so it cannot
 * be split into per-pair quantities by any rule that would be true — nineteen
 * pairs across fifteen combinations does not say which. This only preserves the
 * totals so the seed that follows can distribute a plausible spread and the
 * shop can correct it from the dashboard, rather than every product silently
 * starting at zero.
 */
import { writeFileSync } from 'node:fs'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

config({ path: '.env.local' })
config({ path: '.env' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; titleAr: string; sizes: string[]; colors: string[]; stock: number }>
  >('SELECT id, "titleAr", sizes, colors, stock FROM "Product" ORDER BY "createdAt"')

  const out = process.argv[2] ?? 'prisma/.stock-before.json'
  writeFileSync(out, JSON.stringify(rows, null, 2))

  const total = rows.reduce((sum, r) => sum + Number(r.stock), 0)
  console.log(`captured ${rows.length} products, ${total} units total -> ${out}`)
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
