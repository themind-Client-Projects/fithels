import { NextRequest, NextResponse } from 'next/server'
import { releaseExpiredIntents } from '@/lib/wayle/expire'
import { getAuthUser } from '@/lib/auth-utils'
import crypto from 'crypto'

/** Constant-time compare so the secret cannot be recovered a byte at a time. */
function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(`Bearer ${expected}`)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

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

  // The codebase already uses timingSafeEqual for the Wayle signature; the
  // same treatment belongs here. Fails closed when CRON_SECRET is unset.
  const authorisedByCron = !!cronSecret && secretMatches(provided, cronSecret)

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
