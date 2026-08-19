/**
 * Move the home page's hardcoded artwork into the banners table.
 *
 * The catalogue panels and the feature panel used to be image paths written
 * into Catalog.jsx and Showcase.jsx. They are banner-driven now, but adding the
 * capability did not put anything IN the table — so the admin opened Banners,
 * saw only the three hero slides, and had no way to reach the five images that
 * were actually on the page. This creates the missing rows with the copy those
 * components already displayed, so every section of the home page is editable.
 *
 * Idempotent: a row is skipped when a banner with the same image already
 * exists, so running it twice cannot duplicate a panel. It never updates or
 * deletes anything — edits made in the admin survive a re-run.
 *
 *   npx tsx --env-file=.env prisma/seed-home-banners.ts
 */
import { prisma } from "../lib/prisma";

type Seed = {
  image: string;
  placement: "CATALOG" | "SHOWCASE";
  order: number;
  titleAr: string;
  titleEn: string;
  btnTextAr: string;
  btnTextEn: string;
  subtitleAr?: string;
  subtitleEn?: string;
};

/**
 * `link` is the shop listing for every row — exactly where these panels pointed
 * before. Repointing one at a product is the admin's job, and the whole reason
 * the panels became editable.
 */
const LINK = "/shop-default-grid";

const SEEDS: Seed[] = [
  // First catalogue row — orders 0 and 1 fill it.
  {
    image: "/images/banner/catalog-left.png",
    placement: "CATALOG",
    order: 0,
    titleAr: "التشكيلة الجديدة",
    titleEn: "New Collection",
    btnTextAr: "تسوقي الآن",
    btnTextEn: "Shop Now",
  },
  {
    image: "/images/banner/catalog-right.png",
    placement: "CATALOG",
    order: 1,
    titleAr: "الأكثر مبيعًا",
    titleEn: "Best Sellers",
    btnTextAr: "استكشفي",
    btnTextEn: "Explore",
  },
  // Second catalogue row — orders 2 and 3.
  {
    image: "/images/banner/catalog2-left.png",
    placement: "CATALOG",
    order: 2,
    titleAr: "أناقة المساء",
    titleEn: "Evening Elegance",
    btnTextAr: "اكتشفي",
    btnTextEn: "Discover",
  },
  {
    image: "/images/banner/catalog2-right.png",
    placement: "CATALOG",
    order: 3,
    titleAr: "اختيارات فاخرة",
    titleEn: "Luxury Picks",
    btnTextAr: "عرض الكل",
    btnTextEn: "View All",
  },
  // The feature panel. Copy matches the home.showcase translations it rendered.
  {
    image: "/images/banner/showcase-banner.png",
    placement: "SHOWCASE",
    order: 0,
    subtitleAr: "حصري",
    subtitleEn: "Exclusive",
    titleAr: "خطوة نحو الأناقة",
    titleEn: "A Step Toward Elegance",
    btnTextAr: "تسوق المجموعة",
    btnTextEn: "Shop the Collection",
  },
];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const seed of SEEDS) {
    const existing = await prisma.banner.findFirst({
      where: { image: seed.image },
      select: { id: true },
    });

    if (existing) {
      skipped += 1;
      console.log(`  skip    ${seed.placement.padEnd(9)} ${seed.image}`);
      continue;
    }

    await prisma.banner.create({
      data: {
        image: seed.image,
        link: LINK,
        placement: seed.placement,
        order: seed.order,
        isActive: true,
        titleAr: seed.titleAr,
        titleEn: seed.titleEn,
        btnTextAr: seed.btnTextAr,
        btnTextEn: seed.btnTextEn,
        subtitleAr: seed.subtitleAr ?? null,
        subtitleEn: seed.subtitleEn ?? null,
      },
    });
    created += 1;
    console.log(`  created ${seed.placement.padEnd(9)} ${seed.image}`);
  }

  console.log(`\n  ${created} created, ${skipped} already present`);

  const grouped = await prisma.banner.groupBy({
    by: ["placement"],
    _count: true,
  });
  console.log("  banners by placement:");
  for (const row of grouped) {
    console.log(`    ${row.placement.padEnd(11)} ${row._count}`);
  }

  await prisma.$disconnect();
}

main();
