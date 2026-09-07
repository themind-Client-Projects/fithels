/**
 * Validation for the money and stock fields on a product.
 *
 * These were previously parsed inline with `salePrice ? parseFloat(salePrice) : null`,
 * which has two holes. The admin form keeps the field as a STRING, so `"0"` and
 * `"0.0"` are both truthy and parse to `0`; and order pricing reads
 * `product.salePrice ?? product.price`, where `??` does not fall through on `0`.
 * A single mistyped character therefore made a product free, with real stock
 * consumed. Negative values and `"abc"` (→ NaN) got through the same way.
 */

/**
 * Stable machine-readable reasons. The dashboard is Arabic-first, so the client
 * translates these rather than displaying the English `message`, which exists
 * only as a fallback for API consumers.
 */
export type PricingErrorReason =
  | 'NOT_A_NUMBER'
  | 'PRICE_NOT_POSITIVE'
  | 'SALE_PRICE_NOT_POSITIVE'
  | 'SALE_PRICE_NOT_A_DISCOUNT'
  | 'PRICE_BELOW_EXISTING_SALE_PRICE'
  | 'STOCK_NOT_A_WHOLE_NUMBER'
  | 'PRICE_NOT_WHOLE_DINARS'

export class PricingValidationError extends Error {
  readonly code = 'INVALID_PRICING' as const

  constructor(
    readonly field: string,
    readonly reason: PricingErrorReason,
    message: string
  ) {
    super(message)
    this.name = 'PricingValidationError'
  }
}

/** True for values meaning "not provided" — an empty sale price clears it. */
function isBlank(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '')
  )
}

/** Parses a money value, rejecting NaN/Infinity. Accepts numbers and strings. */
function toNumber(value: unknown, field: string): number {
  const parsed = typeof value === 'number' ? value : Number(String(value).trim())

  if (!Number.isFinite(parsed)) {
    throw new PricingValidationError(field, 'NOT_A_NUMBER', `${field} must be a number.`)
  }
  return parsed
}

export function parsePrice(value: unknown): number {
  const price = toNumber(value, 'price')
  if (price <= 0) {
    throw new PricingValidationError('price', 'PRICE_NOT_POSITIVE', 'Price must be greater than zero.')
  }
  return price
}

/**
 * The dinar price, which is set INDEPENDENTLY of the dollar one.
 *
 * Whole dinars only. The dinar is not subdivided in practice, and the integer
 * stored here is the exact figure shown on the storefront and handed to Wayle —
 * a fraction would have to be rounded somewhere, which is the drift this whole
 * change exists to remove.
 */
export function parsePriceIqd(value: unknown, field = 'priceIqd'): number {
  const price = toNumber(value, field)
  if (price <= 0) {
    throw new PricingValidationError(field, 'PRICE_NOT_POSITIVE', 'Price must be greater than zero.')
  }
  if (!Number.isInteger(price)) {
    throw new PricingValidationError(
      field,
      'PRICE_NOT_WHOLE_DINARS',
      'The dinar price must be a whole number.'
    )
  }
  return price
}

/** The dinar sale price. Optional, and judged against the dinar price. */
export function parseSalePriceIqd(
  value: unknown,
  effectivePriceIqd: number
): number | null {
  if (isBlank(value)) return null

  const salePrice = parsePriceIqd(value, 'salePriceIqd')

  if (salePrice >= effectivePriceIqd) {
    throw new PricingValidationError(
      'salePriceIqd',
      'SALE_PRICE_NOT_A_DISCOUNT',
      'Sale price must be lower than the regular price.'
    )
  }

  return salePrice
}

/**
 * @param effectivePrice the price the product will have once saved — used to
 *   reject a sale price that is not actually a discount.
 */
export function parseSalePrice(
  value: unknown,
  effectivePrice: number
): number | null {
  if (isBlank(value)) return null

  const salePrice = toNumber(value, 'salePrice')

  // Deliberately an error rather than a silent null: an admin who typed 0 meant
  // something, and guessing wrong here is what gave away free products.
  if (salePrice <= 0) {
    throw new PricingValidationError(
      'salePrice',
      'SALE_PRICE_NOT_POSITIVE',
      'Sale price must be greater than zero. Leave it empty to remove the discount.'
    )
  }

  if (salePrice >= effectivePrice) {
    throw new PricingValidationError(
      'salePrice',
      'SALE_PRICE_NOT_A_DISCOUNT',
      'Sale price must be lower than the regular price.'
    )
  }

  return salePrice
}
