/**
 * Seed the reassurance trio with the wording the storefront already showed.
 *
 * The copy used to live in the translation files. Creating the rows means the
 * dashboard opens on the real current text rather than on blanks, so an admin
 * edits what shoppers are seeing instead of retyping it.
 *
 * Idempotent: a slot that already exists is left exactly as it is, so a re-run
 * cannot overwrite wording the shop has since edited.
 *
 *   npx tsx --env-file=.env prisma/seed-trust-badges.ts
 */
import { prisma } from "../lib/prisma";
import { DEFAULT_TRUST_BADGES } from "../lib/settings/trustBadges";

async function main() {
  let created = 0;
  let skipped = 0;

  for (const badge of DEFAULT_TRUST_BADGES) {
    const existing = await prisma.trustBadge.findUnique({
      where: { slot: badge.slot },
      select: { id: true },
    });
    if (existing) {
      skipped += 1;
      console.log(`  skip    ${badge.slot}`);
      continue;
    }
    await prisma.trustBadge.create({ data: badge });
    created += 1;
    console.log(`  created ${badge.slot.padEnd(9)} ${badge.titleAr}`);
  }

  console.log(`\n  ${created} created, ${skipped} already present`);
  await prisma.$disconnect();
}

main();
