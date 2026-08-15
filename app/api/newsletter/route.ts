import { NextRequest } from 'next/server'
import { noStoreJson } from '@/lib/api-response'
import { prisma } from '@/lib/prisma'
import { translatePrismaError } from '@/lib/prisma-errors'

/**
 * POST /api/newsletter — record a newsletter sign-up.
 *
 * Replaces a direct browser POST to
 * `https://express-brevomail.vercel.app/api/contacts`, a third-party endpoint
 * that shipped with the template. Both the footer (rendered on every page) and
 * the pop-up sent shoppers' email addresses there: to an unrelated service, from
 * the customer's own browser, with the address never recorded here. The shop had
 * no list, and no way to know who was on someone else's.
 *
 * Deliberately unauthenticated — a newsletter box is for people who do not have
 * an account yet — so it validates carefully and reveals nothing.
 */

/**
 * Pragmatic address check. Not RFC 5322: the goal is to reject obvious rubbish
 * and cap the length, not to adjudicate exotic-but-legal addresses.
 */
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/
const MAX_EMAIL_LENGTH = 254

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const email = String(body?.email ?? '').trim().toLowerCase()

    if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL.test(email)) {
      return noStoreJson(
        { error: 'Enter a valid email address.', reason: 'INVALID_EMAIL' },
        { status: 400 }
      )
    }

    const source = body?.source === 'popup' ? 'popup' : 'footer'

    // Idempotent: re-submitting an address is a success, not a duplicate-key
    // error, and it also un-hides someone who had previously unsubscribed only
    // if they ask again explicitly — which is what re-submitting the form is.
    await prisma.subscriber.upsert({
      where: { email },
      create: { email, source },
      update: { unsubscribedAt: null },
    })

    // The same response either way. Reporting "already subscribed" would turn
    // this open endpoint into an oracle for testing whether an address is on
    // the list.
    return noStoreJson({ ok: true }, { status: 201 })
  } catch (error) {
    const translated = translatePrismaError(error)
    if (translated) {
      return noStoreJson(
        { error: translated.error, reason: translated.reason },
        { status: translated.status }
      )
    }
    console.error('Newsletter sign-up failed:', error)
    return noStoreJson(
      { error: 'Could not sign you up. Please try again.' },
      { status: 500 }
    )
  }
}
