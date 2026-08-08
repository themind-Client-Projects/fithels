import { NextRequest, NextResponse } from 'next/server'
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const referenceId = request.nextUrl.searchParams.get('ref')
  if (!referenceId) {
    return NextResponse.json({ error: 'Missing ref' }, { status: 400 })
  }

  const intent = await prisma.paymentIntent.findUnique({
    where: { referenceId },
    select: {
      userId: true,
      status: true,
      orderId: true,
      amountIqd: true,
      completedAt: true,
    },
  })

  const isStaff = user.role === 'ADMIN' || user.role === 'EMPLOYEE'

  // Same 404 whether it does not exist or belongs to someone else — telling
  // them apart would confirm which references are real.
  if (!intent || (intent.userId !== user.id && !isStaff)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    referenceId,
    status: intent.status,
    orderId: intent.orderId,
    amountIqd: intent.amountIqd,
    completedAt: intent.completedAt,
    settled: intent.status === 'PAID' || intent.status === 'FAILED',
  })
}
