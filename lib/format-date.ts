/**
 * One way to write a date, for the whole app.
 *
 * THE CALENDAR WAS COMING FROM THE RUNTIME. Dates were formatted with three
 * different locale strings — "ar-SA" in six places, bare "ar" in two, "ar-IQ"
 * in one — and none of them pinned a calendar. For `ar-SA` the default calendar
 * is region-dependent and varies by ICU version: Node 22 renders it as
 * Gregorian, while browsers render it with the Umm al-Qura calendar. The same
 * order therefore read "١٠ سبتمبر ٢٠٢٦" on one screen and
 * "٢٨ ربيع الأول، ١٤٤٨ هـ" on another, from identical code.
 *
 * A shop cannot have a delivery date whose calendar depends on the device
 * reading it, so the calendar is stated explicitly here rather than inherited:
 * `-u-ca-gregory`. That is the only part of this module that is load-bearing.
 *
 * The Arabic locale is `ar-IQ` — the shop is Iraqi, and Iraq uses the Levantine
 * month names (أيلول rather than سبتمبر). It also matches the analytics page,
 * which was already the one place formatting dates correctly. Swapping to
 * `ar-EG-u-ca-gregory` here changes every screen to سبتمبر at once, which is
 * the point of there being one place.
 */

/** Gregorian, stated outright, so no runtime gets to choose. */
const AR = 'ar-IQ-u-ca-gregory'
const EN = 'en-GB'

const localeFor = (locale?: string) => (locale === 'en' ? EN : AR)

/**
 * Anything a date column might actually receive.
 *
 * The call sites took `dateStr` and handed it straight to `new Date()`, so a
 * null or a malformed value rendered the literal text "Invalid Date" in the
 * table. An em dash says "nothing here" and does not look like a bug.
 */
function parse(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

/** e.g. "١٠ أيلول ٢٠٢٦" / "10 Sept 2026". */
export function formatDate(value: unknown, locale?: string): string {
  const date = parse(value)
  if (!date) return '—'
  return date.toLocaleDateString(localeFor(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** The same date with a clock time, for order detail and delivery stamps. */
export function formatDateTime(value: unknown, locale?: string): string {
  const date = parse(value)
  if (!date) return '—'
  return date.toLocaleString(localeFor(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Long form, for a single record rather than a table row. */
export function formatDateLong(value: unknown, locale?: string): string {
  const date = parse(value)
  if (!date) return '—'
  return date.toLocaleDateString(localeFor(locale), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
