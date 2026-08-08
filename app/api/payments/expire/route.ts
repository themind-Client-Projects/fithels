import { NextRequest, NextResponse } from 'next/server'
import { releaseExpiredIntents } from '@/lib/wayle/expire'
import { getAuthUser } from '@/lib/auth-utils'

/**
 * Releases stock held by abandoned online checkouts.
 *
 * The sweep also runs opportunistically whenever an order is created, which is
 * enough for a busy shop. This endpoint exists for the quiet case: if nobody
 * checks out, nothing sweeps, and an abandoned reservation would hold its stock
 * indefinitely. Point a scheduler at it (every 15 minutes is ample).
 *
 * Authenticated either by CRON_SECRET (for a scheduler) or by an admin session
 * (so it can be triggered by hand). Never left open — it mutates stock.
 */
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const provided = request.headers.get('authorization')

  const authorisedByCron =
    !!cronSecret && provided === `Bearer ${cronSecret}`

  if (!authorisedByCron) {
    const user = await getAuthUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const released = await releaseExpiredIntents()
    return NextResponse.json({ released })
  } catch (error) {
    console.error('Payment expiry sweep failed', error)
    return NextResponse.json({ error: 'Sweep failed' }, { status: 500 })
  }
}
