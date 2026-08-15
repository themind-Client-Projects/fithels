import { prisma } from '@/lib/prisma'

/**
 * Orders created before coupons existed have subtotal = 0 (the column default)
 * and discount = 0, while `total` already holds the real amount. Left alone,
 * every historic order would render a 0.00 subtotal next to a correct total.
 *
 * Safe to re-run: it only touches rows that still carry the default.
 */
async function main() {
  // Any row whose subtotal never got written, regardless of discount. The
  // original version also required discount = 0, which would have skipped a row
  // written by a build that knew about `discount` but not `subtotal`.
  const stale = await prisma.order.findMany({
    where: { subtotal: 0, total: { gt: 0 } },
    select: { id: true, total: true, discount: true },
  })

  for (const order of stale) {
    await prisma.order.update({
      where: { id: order.id },
      // total is the payable amount, so the subtotal it came from is
      // total + whatever discount was recorded against it.
      data: { subtotal: order.total + (order.discount ?? 0) },
    })
  }

  console.log(`Backfilled subtotal on ${stale.length} order(s).`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
