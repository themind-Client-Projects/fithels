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
