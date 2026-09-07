/**
 * One definition of the USD → IQD rate for the whole app.
 *
 * Previously the rate lived in three places: a hardcoded `* 1500` in
 * CurrencyFormatter for the storefront, `USD_TO_IQD_RATE` on the server for
 * what Wayle actually charges, and four copy-pasted `$`/`en-US` helpers in the
 * dashboard that ignored IQD entirely. Setting the env var to a real rate made
 * the price a customer read, the price they were charged, and the price staff
 * saw three different numbers for the same order.
 *
 * NEXT_PUBLIC_ so the browser and the server resolve the identical value.
 */
export const DEFAULT_USD_TO_IQD_RATE = 1500

export function getDisplayRate(): number {
  const raw =
    process.env.NEXT_PUBLIC_USD_TO_IQD_RATE ?? process.env.USD_TO_IQD_RATE

  if (!raw) return DEFAULT_USD_TO_IQD_RATE

  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_USD_TO_IQD_RATE
}

export type Currency = 'USD' | 'IQD'

/**
 * Formats a price that is held in BOTH currencies.
 *
 * Prefer this over formatMoney everywhere a real price is shown. The two
 * figures are set independently by the shop, so neither can be derived from the
 * other — showing a dinar price means showing the dinar number that was typed,
 * not the dollar one multiplied by a rate. That multiplication is what made
 * 59,000 IQD display as 58,995.
 *
 * `iqd` is allowed to be null only for legacy rows that predate the dinar
 * column; those fall back to the old conversion so nothing renders blank.
 */
export function formatPrice(
  usd: number | null | undefined,
  iqd: number | null | undefined,
  currency: Currency = 'IQD',
  locale = 'en-US'
): string {
  if (currency === 'IQD') {
    const dinars = Number(iqd)
    if (Number.isFinite(dinars) && dinars > 0) {
      return `${Math.round(dinars).toLocaleString(locale)} IQD`
    }
    // No dinar price stored — convert, as the app did before.
    return formatMoney(usd, 'IQD', locale)
  }
  return formatMoney(usd, 'USD', locale)
}

/**
 * Groups digits for display inside a text input: "10000" -> "10,000".
 *
 * Kept as a string throughout rather than round-tripping through Number, so a
 * half-typed value survives editing: "10," and "1.5" and "" all have to remain
 * exactly what the admin typed until they finish. Only the integer part is
 * grouped; a decimal tail is passed through untouched.
 */
export function groupDigits(raw: string): string {
  const text = String(raw ?? '')
  if (text === '') return ''

  const negative = text.startsWith('-')
  const body = negative ? text.slice(1) : text

  const [whole, ...rest] = body.split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  // A trailing "." is preserved so typing "10000." does not delete the dot.
  const tail = rest.length > 0 ? `.${rest.join('')}` : body.endsWith('.') ? '.' : ''

  return `${negative ? '-' : ''}${grouped}${tail}`
}

/** Strips grouping so the value can be parsed or submitted: "10,000" -> "10000". */
export function ungroupDigits(raw: string): string {
  return String(raw ?? '').replace(/,/g, '')
}

/** Formats an amount for display. `currency` is the viewer's chosen currency. */
export function formatMoney(
  amount: number | null | undefined,
  currency: 'USD' | 'IQD' = 'USD',
  locale = 'en-US'
): string {
  const value = Number(amount)
  if (!Number.isFinite(value)) return currency === 'IQD' ? '0 IQD' : '$0.00'

  if (currency === 'IQD') {
    // Iraqi dinar is not subdivided in practice — whole dinars only.
    return `${Math.round(value * getDisplayRate()).toLocaleString(locale)} IQD`
  }

  return `$${value.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
