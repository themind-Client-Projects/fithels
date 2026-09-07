/**
 * A letter-sized product, so the second size run can be seen end to end.
 *
 * Everything about it is deliberately UNLIKE the shoes already in the
 * catalogue: paired labels (XS/S, M/L) alongside a standalone XL, uneven stock
 * per pair so the size row shows a real gap, and one colour photographed while
 * another is not — which is the state a shop is actually in halfway through.
 *
 * Idempotent. Re-running updates the same slug rather than creating a second
 * one, and it never touches any other product.
 */
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

config({ path: '.env.local' })
config({ path: '.env' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

const SLUG = 'patterned-tights'

/** Paired labels beside a standalone one — exactly how these are sold. */
const SIZES = ['XS/S', 'M/L', 'XL']
const COLORS = ['أسود', 'بني', 'بيج']

/**
 * Uneven on purpose: M/L in بني is out, so the storefront has a struck-through
 * size to render and the dashboard has a red chip. A seed where everything is
 * in stock proves only that the happy path works.
 */
const STOCK: Record<string, Record<string, number>> = {
  'XS/S': { 'أسود': 6, 'بني': 3, 'بيج': 4 },
  'M/L': { 'أسود': 8, 'بني': 0, 'بيج': 5 },
  'XL': { 'أسود': 2, 'بني': 4, 'بيج': 0 },
}

async function main() {
  // Filed under a real category rather than a new one — this is a product, not
  // a taxonomy change.
  const category = await prisma.category.findFirst({
    where: { parentId: { not: null } },
    orderBy: { nameAr: 'asc' },
  })
  if (!category) {
    throw new Error('No sub-category exists to file the product under.')
  }

  const images = [
    '/images/products/womens/women-1.jpg',
    '/images/products/womens/women-2.jpg',
  ]

  const data = {
    titleAr: 'جوارب طويلة منقوشة',
    titleEn: 'Patterned Tights',
    slug: SLUG,
    descAr: 'جوارب طويلة منقوشة بمقاسات حرفية.',
    descEn: 'Patterned tights, sold in letter sizes.',
    // No EU/CM/US table applies, so the only guidance is what the shop writes.
    sizeGuideAr: 'المقاس XS/S يناسب الطول ١٥٠–١٦٥ سم، و M/L يناسب ١٦٥–١٧٥ سم.',
    sizeGuideEn: 'XS/S fits 150-165cm, M/L fits 165-175cm.',
    price: 5.2,
    salePrice: null,
    categoryId: category.id,
    sizeSystem: 'LETTER' as const,
    sizes: SIZES,
    colors: COLORS,
    images,
    isActive: true,
  }

  const product = await prisma.product.upsert({
    where: { slug: SLUG },
    create: data,
    update: data,
  })

  // Replaced wholesale so a re-run cannot leave a stale pair behind.
  await prisma.productVariant.deleteMany({ where: { productId: product.id } })
  await prisma.productVariant.createMany({
    data: SIZES.flatMap((size) =>
      COLORS.map((color) => ({
        productId: product.id,
        size,
        color,
        stock: STOCK[size]?.[color] ?? 0,
      }))
    ),
  })

  // One colour photographed, two not — the half-done state, on purpose.
  await prisma.productColorImage.deleteMany({ where: { productId: product.id } })
  await prisma.productColorImage.create({
    data: { productId: product.id, color: 'أسود', images },
  })

  const total = Object.values(STOCK).reduce(
    (sum, row) => sum + Object.values(row).reduce((a, b) => a + b, 0),
    0
  )
  console.log(
    `seeded "${data.titleAr}" (${SLUG}) — LETTER sizes ${SIZES.join(', ')}, ` +
      `${COLORS.length} colours, ${total} units across ${SIZES.length * COLORS.length} pairs`
  )
  console.log(`  /ar/product-detail/${SLUG}`)
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
