/**
 * Resolving a product's price when it is held in two currencies at once.
 *
 * The shop sets a dollar price and a dinar price INDEPENDENTLY — neither is
 * converted from the other — so almost everything about a price has to be
 * answered per currency, including two things that are easy to miss:
 *
 *   - whether the product is on sale at all, and
 *   - what the discount percentage is.
 *
 * A shoe can be 20,000 -> 15,000 IQD (25% off) and $14 -> $12 (14% off) at the
 * same time, because those are four numbers a person typed, not one number
 * converted twice. Showing the dinar shopper "14% off" would be wrong, and
 * showing either one to both shoppers is wrong half the time.
 *
 * So this returns BOTH resolutions and the display layer picks the one matching
 * the currency the shopper is browsing in.
 */

export interface ResolvedPrice {
  /** What they pay: the sale price when there is one, otherwise the price. */
  current: number
  /** The struck-through original, or null when not on sale. */
  original: number | null
  onSale: boolean
  /** Whole percent off, or null. Never negative. */
  percentOff: number | null
}

function resolveOne(
  price: number | null | undefined,
  salePrice: number | null | undefined
): ResolvedPrice {
  const regular = Number(price)
  const sale = salePrice == null ? null : Number(salePrice)

  // A sale price only counts when it is genuinely lower. `0` is excluded by the
  // `> 0` test rather than by falsiness: a sale price of 0 is a free product,
  // which is a data error, not a discount.
  const onSale =
    sale !== null &&
    Number.isFinite(sale) &&
    sale > 0 &&
    Number.isFinite(regular) &&
    sale < regular

  if (!onSale) {
    return {
      current: Number.isFinite(regular) ? regular : 0,
      original: null,
      onSale: false,
      percentOff: null,
    }
  }

  return {
    current: sale as number,
    original: regular,
    onSale: true,
    percentOff: Math.round(((regular - (sale as number)) / regular) * 100),
  }
}

export interface DualPrice {
  usd: ResolvedPrice
  iqd: ResolvedPrice
}

/** Both currencies resolved from a product row. */
export function resolvePrice(product: {
  price?: number | null
  priceIqd?: number | null
  salePrice?: number | null
  salePriceIqd?: number | null
}): DualPrice {
  return {
    usd: resolveOne(product.price, product.salePrice),
    iqd: resolveOne(product.priceIqd, product.salePriceIqd),
  }
}

/**
 * The shape a product card wants: both currencies, flattened.
 *
 * `isOnSale` and `salePercentage` describe the DINAR price, because that is
 * what the storefront shows by default (useCurrencyStore starts on IQD) and
 * what almost every shopper here sees. The dollar equivalents travel beside
 * them so a card rendering in USD can swap to the right ones rather than
 * quoting a discount that does not apply to the price beneath it.
 */
export function cardPricing(product: {
  price?: number | null
  priceIqd?: number | null
  salePrice?: number | null
  salePriceIqd?: number | null
}) {
  const { usd, iqd } = resolvePrice(product)

  return {
    price: usd.current,
    priceIqd: iqd.current,
    oldPrice: usd.original,
    oldPriceIqd: iqd.original,

    isOnSale: iqd.onSale,
    isOnSaleUsd: usd.onSale,
    salePercentage: iqd.percentOff != null ? `${iqd.percentOff}%` : null,
    salePercentageUsd: usd.percentOff != null ? `${usd.percentOff}%` : null,
  }
}
