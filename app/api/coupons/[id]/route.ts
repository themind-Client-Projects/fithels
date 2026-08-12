import { NextRequest } from 'next/server'
import { noStoreJson } from '@/lib/api-response'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-utils'
import { normaliseCode } from '@/lib/coupons/validate'
import { parseCouponInput, CouponInputError } from '@/lib/coupons/input'

/** GET /api/coupons/[id] — one coupon, with how often it has been redeemed. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return noStoreJson({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: { _count: { select: { redemptions: true, orders: true } } },
    })

    if (!coupon) {
      return noStoreJson({ error: 'Coupon not found' }, { status: 404 })
    }

    return noStoreJson(coupon)
  } catch (error) {
    console.error('Error fetching coupon:', error)
    return noStoreJson({ error: 'Failed to load coupon' }, { status: 500 })
  }
}

/** PATCH /api/coupons/[id] — update a coupon (admin only). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user || user.role !== 'ADMIN') {
      return noStoreJson(
        { error: 'Only administrators can change coupons.' },
        { status: 403 }
      )
    }

    const { id } = await params
    const existing = await prisma.coupon.findUnique({ where: { id } })
    if (!existing) {
      return noStoreJson({ error: 'Coupon not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => null)

    let data
    try {
      data = parseCouponInput(body)
    } catch (error) {
      if (error instanceof CouponInputError) {
        return noStoreJson(
          { error: error.message, reason: error.reason, field: error.field },
          { status: 400 }
        )
      }
      throw error
    }

    const code = normaliseCode(data.code)

    if (code !== existing.code) {
      const clash = await prisma.coupon.findUnique({ where: { code } })
      if (clash) {
        return noStoreJson(
          { error: `The code ${code} already exists.`, reason: 'DUPLICATE_CODE', field: 'code' },
          { status: 409 }
        )
      }
    }

    // Lowering the cap below what has already been redeemed would leave the
    // coupon in a state the claim guard reads as "full" while the dashboard
    // shows a limit that was never reached. Refuse it and say the real number.
    if (data.maxRedemptions != null && data.maxRedemptions < existing.redeemedCount) {
      return noStoreJson(
        {
          error: `This coupon has already been redeemed ${existing.redeemedCount} time(s); the limit cannot be lower than that.`,
          reason: 'LIMIT_BELOW_REDEEMED',
          field: 'maxRedemptions',
          redeemedCount: existing.redeemedCount,
        },
        { status: 409 }
      )
    }

    // `redeemedCount` is deliberately not writable here — it is a claim counter
    // owned by lib/coupons/redeem.ts, and letting an admin edit it would break
    // the guard that stops a coupon being over-redeemed.
    const coupon = await prisma.coupon.update({
      where: { id },
      data: { ...data, code },
    })

    return noStoreJson(coupon)
  } catch (error) {
    console.error('Error updating coupon:', error)
    return noStoreJson({ error: 'Failed to update coupon' }, { status: 500 })
  }
}

/** DELETE /api/coupons/[id] — admin only. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user || user.role !== 'ADMIN') {
      return noStoreJson(
        { error: 'Only administrators can delete coupons.' },
        { status: 403 }
      )
    }

    const { id } = await params
    const existing = await prisma.coupon.findUnique({
      where: { id },
      select: { _count: { select: { redemptions: true } } },
    })

    if (!existing) {
      return noStoreJson({ error: 'Coupon not found' }, { status: 404 })
    }

    // Deleting cascades the redemption rows, which are the record of what each
    // past order was discounted by. Deactivating keeps the history and has the
    // same effect for shoppers, so refuse and point at that instead.
    if (existing._count.redemptions > 0) {
      return noStoreJson(
        {
          error:
            'This coupon has been used on real orders. Deactivate it instead of deleting, so the order history stays intact.',
          reason: 'COUPON_HAS_REDEMPTIONS',
          redemptions: existing._count.redemptions,
        },
        { status: 409 }
      )
    }

    await prisma.coupon.delete({ where: { id } })
    return noStoreJson({ success: true })
  } catch (error) {
    console.error('Error deleting coupon:', error)
    return noStoreJson({ error: 'Failed to delete coupon' }, { status: 500 })
  }
}
