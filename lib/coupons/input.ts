import type { DiscountType } from '@prisma/client'
import { normaliseCode } from './validate'

/**
 * Validation for admin-supplied coupon fields.
 *
 * Separate from lib/coupons/validate.ts on purpose: that module answers "may
 * this shopper use this coupon right now", this one answers "is this a coherent
 * coupon to store at all". Both the create and the update route use it, so a
 * rule cannot be enforced on one and forgotten on the other.
 */

export type CouponInputRejection =
  | 'CODE_REQUIRED'
  | 'CODE_TOO_SHORT'
  | 'CODE_INVALID_CHARS'
  | 'TYPE_INVALID'
  | 'VALUE_NOT_A_NUMBER'
  | 'VALUE_NOT_POSITIVE'
  | 'PERCENT_OUT_OF_RANGE'
  | 'MIN_SUBTOTAL_NEGATIVE'
  | 'MAX_DISCOUNT_NOT_POSITIVE'
  | 'LIMIT_NOT_POSITIVE'
  | 'DATE_INVALID'
  | 'DATE_RANGE_INVERTED'

export class CouponInputError extends Error {
  constructor(
    public readonly reason: CouponInputRejection,
    message: string,
    public readonly field: string
  ) {
    super(message)
    this.name = 'CouponInputError'
  }
}

/** Codes are typed by shoppers, so keep them to characters that survive that. */
const CODE_PATTERN = /^[A-Z0-9_-]+$/

function optionalNumber(
  raw: unknown,
  field: string,
  { positive }: { positive: boolean }
): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  const value = Number(raw)
  if (!Number.isFinite(value)) {
    throw new CouponInputError('VALUE_NOT_A_NUMBER', `${field} must be a number.`, field)
  }
  if (positive && value <= 0) {
    throw new CouponInputError(
      field === 'maxDiscount' ? 'MAX_DISCOUNT_NOT_POSITIVE' : 'LIMIT_NOT_POSITIVE',
      `${field} must be greater than zero.`,
      field
    )
  }
  if (!positive && value < 0) {
    throw new CouponInputError('MIN_SUBTOTAL_NEGATIVE', `${field} cannot be negative.`, field)
  }
  return value
}

function optionalDate(raw: unknown, field: string): Date | null {
  if (raw === null || raw === undefined || raw === '') return null
  const date = new Date(String(raw))
  if (Number.isNaN(date.getTime())) {
    throw new CouponInputError('DATE_INVALID', `${field} is not a valid date.`, field)
  }
  return date
}

export interface ParsedCouponInput {
  code: string
  type: DiscountType
  value: number
  minSubtotal: number | null
  maxDiscount: number | null
  startsAt: Date | null
  expiresAt: Date | null
  maxRedemptions: number | null
  maxPerUser: number | null
  isActive: boolean
}

export function parseCouponInput(body: unknown): ParsedCouponInput {
  const input = (body ?? {}) as Record<string, unknown>

  const code = normaliseCode(input.code)
  if (!code) {
    throw new CouponInputError('CODE_REQUIRED', 'A code is required.', 'code')
  }
  if (code.length < 3) {
    throw new CouponInputError(
      'CODE_TOO_SHORT',
      'The code must be at least 3 characters.',
      'code'
    )
  }
  if (!CODE_PATTERN.test(code)) {
    throw new CouponInputError(
      'CODE_INVALID_CHARS',
      'The code may use letters, numbers, hyphens and underscores only.',
      'code'
    )
  }

  const type = input.type === 'FIXED' ? 'FIXED' : input.type === 'PERCENT' ? 'PERCENT' : null
  if (!type) {
    throw new CouponInputError('TYPE_INVALID', 'Choose a percentage or a fixed amount.', 'type')
  }

  const value = Number(input.value)
  if (!Number.isFinite(value)) {
    throw new CouponInputError('VALUE_NOT_A_NUMBER', 'The value must be a number.', 'value')
  }
  if (value <= 0) {
    throw new CouponInputError(
      'VALUE_NOT_POSITIVE',
      'The value must be greater than zero.',
      'value'
    )
  }
  // A percentage above 100 would discount more than the basket. computeDiscount
  // clamps it anyway, but storing it would misrepresent the offer everywhere it
  // is displayed.
  if (type === 'PERCENT' && value > 100) {
    throw new CouponInputError(
      'PERCENT_OUT_OF_RANGE',
      'A percentage discount cannot exceed 100.',
      'value'
    )
  }

  const startsAt = optionalDate(input.startsAt, 'startsAt')
  const expiresAt = optionalDate(input.expiresAt, 'expiresAt')
  if (startsAt && expiresAt && expiresAt <= startsAt) {
    throw new CouponInputError(
      'DATE_RANGE_INVERTED',
      'The end date must come after the start date.',
      'expiresAt'
    )
  }

  return {
    code,
    type,
    value,
    minSubtotal: optionalNumber(input.minSubtotal, 'minSubtotal', { positive: false }),
    maxDiscount: optionalNumber(input.maxDiscount, 'maxDiscount', { positive: true }),
    startsAt,
    expiresAt,
    maxRedemptions: optionalNumber(input.maxRedemptions, 'maxRedemptions', { positive: true }),
    maxPerUser: optionalNumber(input.maxPerUser, 'maxPerUser', { positive: true }),
    isActive: input.isActive === undefined ? true : Boolean(input.isActive),
  }
}
