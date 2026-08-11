import { NextResponse } from 'next/server'

/**
 * JSON response for per-user data that must never be cached.
 *
 * These endpoints had no Cache-Control at all. A GET with no cache directives
 * is heuristically cacheable, which caused two problems:
 *
 *  - Correctness: an admin moving an order to IN_DELIVERY was not visible to
 *    the customer, because their browser kept serving the previous response.
 *  - Privacy: order payloads carry the customer's phone number and delivery
 *    address, and a shared proxy was free to store and re-serve them.
 *
 * `private` keeps intermediaries out even if a future change relaxes no-store.
 */
export function noStoreJson(data: unknown, init?: ResponseInit) {
  const res = NextResponse.json(data as never, init)
  res.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate')
  return res
}
