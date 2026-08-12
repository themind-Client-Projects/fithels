import type { Prisma } from '@prisma/client'
import { CouponError } from './validate'

/**
 * Claiming and releasing coupon redemptions.
 *
 * The validation in ./validate.ts checks the limits, but two checkouts can pass
 * that check at the same instant — it reads, it does not reserve. Everything
 * here reserves.
 *
 * Must run inside the same transaction as the order insert, so a coupon is
 * never consumed by an order that fails to be created.
 */

/**
 * Consume one redemption of `couponId` for `userId`, attached to `orderId`.
 *
 * Two independent races are closed:
 *
 *   1. The GLOBAL cap, via a conditional increment. `redeemedCount` only moves
 *      while it is still below the ceiling we validated against, so the last
 *      seat can be taken exactly once no matter how many checkouts collide.
 *
 *   2. The PER-USER cap, via the unique index on (couponId, userId, slot).
 *      Concurrent checkouts compute the same next slot and one of them loses on
 *      the constraint. A `count()` check could not do this: under READ
 *      COMMITTED both transactions would read the same count and both proceed.
 *
 * @throws CouponError when the coupon ran out between validation and here.
 */
export async function claimCouponRedemption(
  tx: Prisma.TransactionClient,
  {
    couponId,
    userId,
    orderId,
    amount,
    maxRedemptions,
    maxPerUser,
  }: {
    couponId: string
    userId: string
    orderId: string
    amount: number
    maxRedemptions: number | null
    maxPerUser: number | null
  }
): Promise<void> {
  // 1. Global cap.
  //
  // Prisma cannot compare two columns in a filter, so the ceiling is passed in
  // as the literal read during validation. That is sound: the guard still
  // executes as a single conditional UPDATE in the database, so only one of N
  // racing transactions can move the counter across the limit.
  const claimed = await tx.coupon.updateMany({
    where: {
      id: couponId,
      isActive: true,
      ...(maxRedemptions != null ? { redeemedCount: { lt: maxRedemptions } } : {}),
    },
    data: { redeemedCount: { increment: 1 } },
  })

  if (claimed.count === 0) {
    throw new CouponError(
      'USAGE_LIMIT_REACHED',
      'This code was fully redeemed while you were checking out.'
    )
  }

  // 2. Per-user cap.
  //
  // Slots are never reused — voided redemptions keep their row — so counting
  // every row (voided or not) always yields a fresh slot number.
  const usedSlots = await tx.couponRedemption.count({
    where: { couponId, userId },
  })

  if (maxPerUser != null) {
    const live = await tx.couponRedemption.count({
      where: { couponId, userId, voidedAt: null },
    })
    if (live >= maxPerUser) {
      throw new CouponError('USER_LIMIT_REACHED', 'You have already used this code.')
    }
  }

  try {
    await tx.couponRedemption.create({
      data: { couponId, userId, orderId, slot: usedSlots, amount },
    })
  } catch (error) {
    // P2002 = unique violation: another checkout for the same shopper took this
    // slot first. That IS the per-user limit doing its job.
    if (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === 'P2002'
    ) {
      throw new CouponError(
        'USER_LIMIT_REACHED',
        'You have already used this code.'
      )
    }
    throw error
  }
}

/**
 * Hand a redemption back after an order is cancelled.
 *
 * Voids rather than deletes, so the audit trail survives and the slot number
 * stays taken — reusing a slot would let a later redemption collide with a
 * surviving row and be rejected for the wrong reason.
 *
 * Idempotent: the conditional update means a second cancellation of the same
 * order matches nothing and leaves `redeemedCount` alone. Without that guard,
 * a double-cancel would decrement twice and quietly mint a free redemption —
 * the same class of bug as crediting stock twice.
 *
 * @returns true if this call performed the release.
 */
export async function releaseCouponRedemption(
  tx: Prisma.TransactionClient,
  orderId: string
): Promise<boolean> {
  const redemption = await tx.couponRedemption.findUnique({
    where: { orderId },
    select: { id: true, couponId: true },
  })

  if (!redemption) return false

  const voided = await tx.couponRedemption.updateMany({
    where: { id: redemption.id, voidedAt: null },
    data: { voidedAt: new Date() },
  })

  if (voided.count === 0) return false

  // Floor at zero. An admin who lowers redeemedCount by hand should not be able
  // to drive it negative through a later cancellation.
  await tx.coupon.updateMany({
    where: { id: redemption.couponId, redeemedCount: { gt: 0 } },
    data: { redeemedCount: { decrement: 1 } },
  })

  return true
}
