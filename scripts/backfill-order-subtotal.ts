import { prisma } from '@/lib/prisma'

/**
 * Orders created before coupons existed have subtotal = 0 (the column default)
 * and discount = 0, while `total` already holds the real amount. Left alone,
 * every historic order would render a 0.00 subtotal next to a correct total.
 *
 * Safe to re-run: it only touches rows that still carry the default.
 */
async function main() {
  const stale = await prisma.order.findMany({
    where: { subtotal: 0, discount: 0 },
    select: { id: true, total: true },
  })

  for (const order of stale) {
    await prisma.order.update({
      where: { id: order.id },
      data: { subtotal: order.total },
    })
  }

  console.log(`Backfilled subtotal on ${stale.length} order(s).`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
