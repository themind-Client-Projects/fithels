import { NextRequest, NextResponse } from 'next/server'
import { noStoreJson } from '@/lib/api-response'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-utils'

/**
 * Polled by the checkout return page while it waits for the webhook.
 *
 * Ownership is checked against the session: without it, a reference id is a
 * guessable handle onto somebody else's order state.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser()
  if (!user) {
    return noStoreJson({ error: 'Unauthorized' }, { status: 401 })
  }

  const referenceId = request.nextUrl.searchParams.get('ref')
  if (!referenceId) {
    return noStoreJson({ error: 'Missing ref' }, { status: 400 })
  }

  const intent = await prisma.paymentIntent.findUnique({
    where: { referenceId },
    select: {
      userId: true,
      status: true,
      orderId: true,
      amountIqd: true,
      completedAt: true,
      failureReason: true,
    },
  })

  const isStaff = user.role === 'ADMIN' || user.role === 'EMPLOYEE'

  // Same 404 whether it does not exist or belongs to someone else — telling
  // them apart would confirm which references are real.
  if (!intent || (intent.userId !== user.id && !isStaff)) {
    return noStoreJson({ error: 'Not found' }, { status: 404 })
  }

  // Money reached us for an order we had already given up on. The intent stays
  // FAILED/EXPIRED for accounting, but the payer must not be told their payment
  // failed — they have been charged.
  const needsReview = (intent.failureReason ?? '').includes('NEEDS_REVIEW')
    || (intent.failureReason ?? '').includes('NEEDS_RECONCILIATION')

  return noStoreJson({
    referenceId,
    status: intent.status,
    orderId: intent.orderId,
    amountIqd: intent.amountIqd,
    completedAt: intent.completedAt,
    needsReview,
    // EXPIRED is terminal too — omitting it left a poller spinning forever.
    settled:
      intent.status === 'PAID' ||
      intent.status === 'FAILED' ||
      intent.status === 'EXPIRED',
  })
}
