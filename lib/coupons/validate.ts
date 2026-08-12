import type { Coupon } from '@prisma/client'

/**
 * Coupon validation and discount arithmetic.
 *
 * Pure and side-effect free on purpose: the same rules decide what the checkout
 * *previews* and what the order endpoint actually *charges*, so the two cannot
 * disagree. The preview endpoint is a convenience; POST /api/orders re-runs all
 * of this against the database before it charges anyone.
 */

export type CouponRejection =
  | 'NOT_FOUND'
  | 'INACTIVE'
  | 'NOT_STARTED'
  | 'EXPIRED'
  | 'BELOW_MINIMUM'
  | 'USAGE_LIMIT_REACHED'
  | 'USER_LIMIT_REACHED'
  | 'EMPTY_BASKET'

export class CouponError extends Error {
  constructor(
    public readonly reason: CouponRejection,
    message: string,
    /** Extra context the UI needs, e.g. the minimum the basket must reach. */
    public readonly detail?: Record<string, number | string>
  ) {
    super(message)
    this.name = 'CouponError'
  }
}

/**
 * Codes are compared upper-cased and trimmed.
 *
 * Shoppers paste codes with stray whitespace and type them in whatever case
 * they like; treating "  save10 " and "SAVE10" as different codes would make a
 * valid coupon look broken.
 */
export function normaliseCode(code: unknown): string {
  return String(code ?? '').trim().toUpperCase()
}

/**
 * Round to whole cents.
 *
 * Prices are IEEE doubles, so a naive percentage lands on values like
 * 23.999999999999996. Rounding here — once, at the point the discount is
 * decided — keeps `subtotal - discount` exact to the cent, which is what the
 * order total and the amount sent to Wayle are both derived from.
 */
export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

/**
 * The discount a coupon grants on a given subtotal, in USD.
 *
 * Never exceeds the subtotal: a fixed 20 off a 15 basket discounts 15, not 20,
 * so an order can never total a negative amount (and a customer can never be
 * owed money by placing an order).
 */
export function computeDiscount(coupon: Coupon, subtotal: number): number {
  if (subtotal <= 0) return 0

  let discount: number
  if (coupon.type === 'PERCENT') {
    discount = (subtotal * coupon.value) / 100
    if (coupon.maxDiscount != null) {
      discount = Math.min(discount, coupon.maxDiscount)
    }
  } else {
    discount = coupon.value
  }

  return roundMoney(Math.max(0, Math.min(discount, subtotal)))
}

export interface CouponCheckInput {
  coupon: Coupon
  subtotal: number
  /** Non-voided redemptions this shopper already holds for this coupon. */
  userRedemptions: number
  now?: Date
}

/**
 * Throws `CouponError` when the coupon may not be used; returns the discount
 * when it may.
 *
 * The limit checks here are advisory — they give a good error message and stop
 * obviously doomed checkouts early. They are NOT what enforces the limits: two
 * shoppers can pass this at the same instant. The atomic claim in
 * lib/coupons/redeem.ts is the real gate.
 */
export function assertCouponUsable({
  coupon,
  subtotal,
  userRedemptions,
  now = new Date(),
}: CouponCheckInput): number {
  if (subtotal <= 0) {
    throw new CouponError('EMPTY_BASKET', 'There is nothing in the basket to discount.')
  }

  if (!coupon.isActive) {
    throw new CouponError('INACTIVE', 'This code is no longer available.')
  }

  if (coupon.startsAt && now < coupon.startsAt) {
    throw new CouponError('NOT_STARTED', 'This code is not active yet.', {
      startsAt: coupon.startsAt.toISOString(),
    })
  }

  if (coupon.expiresAt && now > coupon.expiresAt) {
    throw new CouponError('EXPIRED', 'This code has expired.', {
      expiresAt: coupon.expiresAt.toISOString(),
    })
  }

  if (coupon.minSubtotal != null && subtotal < coupon.minSubtotal) {
    throw new CouponError(
      'BELOW_MINIMUM',
      'The basket does not reach this code’s minimum.',
      { minSubtotal: coupon.minSubtotal, subtotal: roundMoney(subtotal) }
    )
  }

  if (coupon.maxRedemptions != null && coupon.redeemedCount >= coupon.maxRedemptions) {
    throw new CouponError('USAGE_LIMIT_REACHED', 'This code has been fully redeemed.')
  }

  if (coupon.maxPerUser != null && userRedemptions >= coupon.maxPerUser) {
    throw new CouponError('USER_LIMIT_REACHED', 'You have already used this code.')
  }

  return computeDiscount(coupon, subtotal)
}
