import { NextRequest } from 'next/server'
import { noStoreJson } from '@/lib/api-response'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-utils'
import {
  assertCouponUsable,
  CouponError,
  normaliseCode,
  roundMoney,
} from '@/lib/coupons/validate'

/**
 * POST /api/coupons/validate — preview what a code is worth for this basket.
 *
 * PREVIEW ONLY. It reserves nothing and it is not what the customer is charged
 * against: POST /api/orders re-reads the coupon and recomputes the discount
 * from the database before creating the order. A caller who lies to this
 * endpoint only lies to their own screen.
 *
 * The basket subtotal is recomputed here from product ids, for the same reason
 * order creation does: a client-sent subtotal would let a shopper preview (and
 * then be shown) a discount that the real endpoint will not honour.
 */
export async function POST(request: NextRequest) {
  try {
    // Coupons are per-shopper (maxPerUser), so there is no meaningful answer
    // for an anonymous caller — and answering would turn this into an oracle
    // for probing which codes exist.
    const user = await getAuthUser()
    if (!user) {
      return noStoreJson({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const code = normaliseCode(body?.code)
    if (!code) {
      return noStoreJson(
        { error: 'Enter a code.', reason: 'NOT_FOUND' },
        { status: 400 }
      )
    }

    const items = Array.isArray(body?.items) ? body.items : []
    if (items.length === 0) {
      return noStoreJson(
        { error: 'There is nothing in the basket to discount.', reason: 'EMPTY_BASKET' },
        { status: 400 }
      )
    }

    // Server-derived subtotal, from live prices.
    const productIds: string[] = Array.from(
      new Set<string>(
        items
          .map((i: { productId?: unknown }) => String(i?.productId ?? ''))
          .filter((id: string) => id.length > 0)
      )
    )

    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      select: { id: true, price: true, salePrice: true },
    })
    const priceById = new Map(
      products.map((p) => [p.id, p.salePrice ?? p.price] as const)
    )

    let subtotal = 0
    for (const item of items) {
      const unit = priceById.get(String(item?.productId ?? ''))
      const qty = Number(item?.quantity)
      if (unit === undefined || !Number.isFinite(qty) || qty < 1) continue
      subtotal += unit * Math.floor(qty)
    }
    subtotal = roundMoney(subtotal)

    const coupon = await prisma.coupon.findUnique({ where: { code } })

    // Same response whether the code does not exist or is switched off, so this
    // endpoint cannot be used to enumerate which codes are real.
    if (!coupon) {
      return noStoreJson(
        { error: 'This code is not valid.', reason: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    const userRedemptions = await prisma.couponRedemption.count({
      where: { couponId: coupon.id, userId: user.id, voidedAt: null },
    })

    const discount = assertCouponUsable({ coupon, subtotal, userRedemptions })

    return noStoreJson({
      valid: true,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      subtotal,
      discount,
      total: roundMoney(subtotal - discount),
    })
  } catch (error) {
    if (error instanceof CouponError) {
      return noStoreJson(
        { valid: false, error: error.message, reason: error.reason, ...error.detail },
        // A rejected-but-real code is a client condition, not a server fault.
        { status: 422 }
      )
    }
    console.error('Coupon validation failed:', error)
    return noStoreJson({ error: 'Could not check that code.' }, { status: 500 })
  }
}
