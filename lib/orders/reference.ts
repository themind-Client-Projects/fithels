/**
 * The human-facing order number.
 *
 * ONE definition, because there were two. Customer screens derived it as
 * `id.slice(0, 8)` while every dashboard screen used `id.slice(-6)`, so order
 * `cmsu6r8rh0000qru7oex664i5` was "#CMSU6R8R" to the shopper and "#X664I5" to
 * the staff member taking their call — two strings with no characters in
 * common. Searching the dashboard for the number a customer read out returned
 * nothing.
 *
 * The customer-facing form wins: it is the one already printed on order
 * confirmations and payment receipts, so it is the number people already hold.
 *
 * Not a stored column: cuid ids share no common prefix in practice, and a
 * separate sequence would need its own uniqueness handling. If collisions ever
 * matter, this is the single place to lengthen the slice.
 */
export function orderNumber(id: string | null | undefined): string {
  if (!id) return ''
  return String(id).slice(0, 8).toUpperCase()
}

/** The same value with the leading `#` the UI always renders. */
export function orderLabel(id: string | null | undefined): string {
  const n = orderNumber(id)
  return n ? `#${n}` : '—'
}
