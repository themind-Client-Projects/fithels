/**
 * Give the existing flat categories a section to live in.
 *
 * The five categories that predate the tree — كعب ستيليتو, صنادل, كعب بلاتفورم,
 * كعب سهرة, بامبس — are all shoe TYPES, i.e. already the sub-category level. They
 * just had nothing above them. This creates one "الأحذية" section and moves them
 * under it.
 *
 * No product is touched: products point at the categories, and the categories
 * keep their ids. That is the whole reason the tree is one self-referencing
 * table rather than separate Section and Category tables.
 *
 * Idempotent, and deliberately conservative: it only adopts categories that are
 * currently top-level AND have no children of their own, so re-running it after
 * the shop has built its own sections cannot flatten that work.
 *
 *   npx tsx --env-file=.env prisma/seed-category-tree.ts
 */
import { prisma } from "../lib/prisma";

const SECTION = { nameAr: "الأحذية", nameEn: "Shoes", slug: "shoes" };

async function main() {
  let section = await prisma.category.findUnique({
    where: { slug: SECTION.slug },
    select: { id: true, parentId: true },
  });

  if (!section) {
    section = await prisma.category.create({
      data: SECTION,
      select: { id: true, parentId: true },
    });
    console.log(`  created section ${SECTION.nameAr}`);
  } else {
    console.log(`  section ${SECTION.nameAr} already exists`);
  }

  // Top-level rows that are not the section itself and hold no children.
  const orphans = await prisma.category.findMany({
    where: { parentId: null, id: { not: section.id } },
    select: { id: true, nameAr: true, _count: { select: { children: true } } },
  });

  let moved = 0;
  for (const cat of orphans) {
    if (cat._count.children > 0) {
      console.log(`  skip   ${cat.nameAr} — it is a section of its own`);
      continue;
    }
    await prisma.category.update({
      where: { id: cat.id },
      data: { parentId: section.id },
    });
    console.log(`  moved  ${cat.nameAr} -> ${SECTION.nameAr}`);
    moved += 1;
  }

  console.log(`\n  ${moved} categor${moved === 1 ? "y" : "ies"} adopted`);

  const tree = await prisma.category.findMany({
    where: { parentId: null },
    select: {
      nameAr: true,
      children: { select: { nameAr: true, _count: { select: { products: true } } } },
    },
  });
  console.log("\n  tree now:");
  for (const s of tree) {
    console.log(`    ${s.nameAr}`);
    for (const c of s.children) console.log(`      └─ ${c.nameAr} (${c._count.products} products)`);
  }

  await prisma.$disconnect();
}

main();
