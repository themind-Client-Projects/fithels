import { prisma } from '@/lib/prisma'
import { DEFAULT_USD_TO_IQD_RATE } from '@/lib/currency'
import { buildProductSlug } from '@/lib/products/slug'

/**
 * Seed a catalogue priced for the Iraqi market: 1,000–4,000 IQD.
 *
 * PRICES ARE STORED IN USD. Everything the shopper sees is converted at
 * lib/currency's rate (1500 by default), and the amount sent to Wayle is
 * derived the same way — so the stored figure has to be the USD equivalent,
 * not the dinar value.
 *
 * That conversion is why every price below is a multiple of 15 IQD: prices are
 * stored to the cent, and one cent is exactly 15 IQD at this rate. A price of
 * 1,000 IQD is not representable (it would round to 1,005) whereas 1,050 is
 * exact. Picking off-grid numbers would make the displayed price drift from the
 * amount actually charged.
 *
 * Existing products are REPRICED into the same band rather than deleted:
 * OrderItem.price snapshots what was charged at the time, so past orders keep
 * their real historic totals and nothing in the ledger moves.
 */

const RATE = DEFAULT_USD_TO_IQD_RATE

/** IQD -> the USD figure that renders back to exactly that many dinars. */
const iqd = (dinars: number): number => {
  if (dinars % 15 !== 0) {
    throw new Error(
      `${dinars} IQD is not representable at ${RATE}/USD — use a multiple of 15`
    )
  }
  return Number((dinars / RATE).toFixed(2))
}

const img = (n: number) => `/images/products/womens/women-${n}.jpg`

interface Seed {
  titleAr: string
  titleEn: string
  descAr: string
  descEn: string
  priceIqd: number
  salePriceIqd?: number
  categorySlug: string
  images: string[]
  sizes: string[]
  colors: string[]
  stock: number
}

const SEEDS: Seed[] = [
  {
    titleAr: 'شبشب منزلي مريح',
    titleEn: 'Comfy House Slippers',
    descAr: 'شبشب خفيف للاستعمال اليومي داخل المنزل، نعل مانع للانزلاق.',
    descEn: 'Lightweight everyday indoor slippers with a non-slip sole.',
    priceIqd: 1050,
    categorySlug: 'sandals',
    images: [img(11), img(12)],
    sizes: ['36', '37', '38', '39', '40'],
    colors: ['وردي', 'أبيض', 'رمادي'],
    stock: 60,
  },
  {
    titleAr: 'صندل بلاستيكي صيفي',
    titleEn: 'Summer Jelly Sandals',
    descAr: 'صندل صيفي مقاوم للماء، مناسب للاستخدام اليومي.',
    descEn: 'Water-friendly summer sandals for everyday wear.',
    priceIqd: 1500,
    salePriceIqd: 1200,
    categorySlug: 'sandals',
    images: [img(21), img(22), img(23)],
    sizes: ['36', '37', '38', '39'],
    colors: ['أسود', 'بيج', 'أزرق فاتح'],
    stock: 45,
  },
  {
    titleAr: 'حذاء قماشي كاجوال',
    titleEn: 'Casual Canvas Shoes',
    descAr: 'حذاء قماشي مريح بنعل مطاطي، يناسب المشي اليومي.',
    descEn: 'Comfortable canvas shoes with a rubber sole for daily walking.',
    priceIqd: 1800,
    categorySlug: 'pumps',
    images: [img(31), img(32)],
    sizes: ['37', '38', '39', '40', '41'],
    colors: ['أبيض', 'أسود', 'وردي داكن'],
    stock: 38,
  },
  {
    titleAr: 'باليرينا كلاسيكية',
    titleEn: 'Classic Ballet Flats',
    descAr: 'حذاء باليرينا بتصميم بسيط يناسب العمل والخروج.',
    descEn: 'Simple ballet flats that work for the office and for going out.',
    priceIqd: 2250,
    categorySlug: 'pumps',
    images: [img(41), img(42), img(43)],
    sizes: ['36', '37', '38', '39', '40'],
    colors: ['أسود', 'بيج', 'أحمر'],
    stock: 30,
  },
  {
    titleAr: 'كعب صغير للعمل',
    titleEn: 'Low Block Heel',
    descAr: 'كعب منخفض ثابت ومريح للوقوف الطويل.',
    descEn: 'A low, stable block heel that stays comfortable all day.',
    priceIqd: 2700,
    salePriceIqd: 2250,
    categorySlug: 'platform-heels',
    images: [img(51), img(52), img(53)],
    sizes: ['36', '37', '38', '39'],
    colors: ['أسود', 'رمادي غامق', 'بني'],
    stock: 26,
  },
  {
    titleAr: 'صندل بكعب رفيع',
    titleEn: 'Slim Heel Sandals',
    descAr: 'صندل بكعب رفيع بأشرطة ناعمة، مناسب للمناسبات.',
    descEn: 'Slim-heeled sandals with fine straps for occasions.',
    priceIqd: 3000,
    categorySlug: 'stiletto-heels',
    images: [img(61), img(62)],
    sizes: ['36', '37', '38', '39', '40'],
    colors: ['ذهبي', 'أسود', 'فضي'],
    stock: 22,
  },
  {
    titleAr: 'حذاء سهرة لامع',
    titleEn: 'Glossy Evening Shoe',
    descAr: 'حذاء سهرة بلمعة خفيفة وكعب متوسط الارتفاع.',
    descEn: 'An evening shoe with a soft sheen and a mid-height heel.',
    priceIqd: 3750,
    categorySlug: 'evening-heels',
    images: [img(71), img(72), img(73)],
    sizes: ['37', '38', '39', '40'],
    colors: ['أسود', 'ذهبي', 'وردي داكن'],
    stock: 18,
  },
  {
    titleAr: 'بوت قصير للشتاء',
    titleEn: 'Short Winter Boot',
    descAr: 'بوت قصير مبطن يناسب الأيام الباردة.',
    descEn: 'A lined short boot for cold days.',
    priceIqd: 3900,
    salePriceIqd: 3300,
    categorySlug: 'platform-heels',
    images: [img(81), img(82), img(83)],
    sizes: ['37', '38', '39', '40', '41'],
    colors: ['بني', 'أسود', 'رمادي'],
    stock: 20,
  },
]

/** Existing catalogue, repriced into the same band (IQD, multiples of 15). */
const REPRICE: Record<string, { priceIqd: number; salePriceIqd?: number }> = {
  'كعب ستيليتو': { priceIqd: 3000 },
  'ستيليتو شامواه وردي': { priceIqd: 2250, salePriceIqd: 1800 },
  'كعب صيفي بأشرطة': { priceIqd: 3750 },
  'بامبس كلاسيك': { priceIqd: 2700 },
  'كعب بلاتفورم شيك': { priceIqd: 3900 },
  'صندل بكعب عريض': { priceIqd: 2400 },
  'كعب بلاتفورم أحمر': { priceIqd: 1950 },
  'بامبس أسود أنيق': { priceIqd: 2100, salePriceIqd: 1650 },
}

async function main() {
  const categories = await prisma.category.findMany({ select: { id: true, slug: true } })
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c.id]))

  let created = 0
  let skipped = 0

  for (const seed of SEEDS) {
    const categoryId = categoryBySlug.get(seed.categorySlug)
    if (!categoryId) {
      console.warn(`  skip "${seed.titleEn}" — no category ${seed.categorySlug}`)
      skipped++
      continue
    }

    const slug = buildProductSlug(seed.titleEn, seed.titleAr)
    const exists = await prisma.product.findUnique({ where: { slug } })
    if (exists) {
      console.log(`  already present: ${slug}`)
      skipped++
      continue
    }

    const price = iqd(seed.priceIqd)
    const salePrice = seed.salePriceIqd ? iqd(seed.salePriceIqd) : null

    await prisma.product.create({
      data: {
        titleAr: seed.titleAr,
        titleEn: seed.titleEn,
        slug,
        descAr: seed.descAr,
        descEn: seed.descEn,
        price,
        salePrice,
        categoryId,
        images: seed.images,
        sizes: seed.sizes,
        colors: seed.colors,
        stock: seed.stock,
        isActive: true,
      },
    })
    created++
    console.log(
      `  + ${seed.titleAr.padEnd(22)} ${String(seed.priceIqd).padStart(5)} IQD` +
        (seed.salePriceIqd ? ` (sale ${seed.salePriceIqd} IQD)` : '')
    )
  }

  let repriced = 0
  for (const [titleAr, target] of Object.entries(REPRICE)) {
    const product = await prisma.product.findFirst({ where: { titleAr }, select: { id: true } })
    if (!product) continue
    await prisma.product.update({
      where: { id: product.id },
      data: {
        price: iqd(target.priceIqd),
        salePrice: target.salePriceIqd ? iqd(target.salePriceIqd) : null,
      },
    })
    repriced++
    console.log(`  ~ ${titleAr.padEnd(22)} ${String(target.priceIqd).padStart(5)} IQD`)
  }

  console.log(`\ncreated ${created}, skipped ${skipped}, repriced ${repriced}`)

  const all = await prisma.product.findMany({
    where: { isActive: true },
    select: { price: true, salePrice: true },
  })
  const dinars = all.map((p) => Math.round((p.salePrice ?? p.price) * RATE))
  console.log(
    `catalogue now ${Math.min(...dinars)}–${Math.max(...dinars)} IQD across ${all.length} products`
  )
  const belowFloor = dinars.filter((d) => d < 1000).length
  if (belowFloor > 0) {
    console.warn(
      `WARNING: ${belowFloor} product(s) price below Wayle's ${1000} IQD online-payment minimum`
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
