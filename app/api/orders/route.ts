import { NextRequest, NextResponse } from 'next/server'
import { noStoreJson } from '@/lib/api-response'
import type { OrderStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { variantKey } from '@/lib/products/variants'
import { getAuthUser } from '@/lib/auth-utils'
import {
  getUsdToIqdRate,
  getSiteUrl,
  WAYLE_MIN_AMOUNT_IQD,
} from '@/lib/wayle/config'
import {
  usdToIqd,
  assertAboveWayleMinimum,
  WayleMinimumAmountError,
} from '@/lib/wayle/amounts'
import { createPaymentLink, generateReferenceId } from '@/lib/wayle/client'
import { releaseExpiredIntents } from '@/lib/wayle/expire'
import { cancelOrderAndReleaseStock } from '@/lib/orders/stock'
import {
  assertCouponUsable,
  CouponError,
  normaliseCode,
  roundMoney,
} from '@/lib/coupons/validate'
import { claimCouponRedemption } from '@/lib/coupons/redeem'

/**
 * Raised inside the order transaction when a conditional stock decrement
 * matches no rows — i.e. another checkout claimed the last units first.
 * Thrown (rather than returned) so the surrounding transaction rolls back.
 */
class InsufficientStockError extends Error {
  constructor(public readonly productId: string) {
    super(`Insufficient stock for product ${productId}`)
    this.name = 'InsufficientStockError'
  }
}

/** Hard ceiling so a caller cannot ask for the whole table in one request. */
const MAX_ORDER_PAGE_SIZE = 100
const DEFAULT_ORDER_PAGE_SIZE = 20

// GET /api/orders - List orders (role-based)
// ADMIN/EMPLOYEE: all orders | CUSTOMER: own orders only
//
// Paginated. This previously returned EVERY order, each with all line items and
// the full product payload behind them, to render ten dashboard rows — tens of
// megabytes of JSON parsed on the main thread once a store had real history.
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return noStoreJson({ error: 'Unauthorized' }, { status: 401 })
    }

    const isStaff = user.role === 'ADMIN' || user.role === 'EMPLOYEE'

    const { searchParams } = new URL(request.url)

    const requestedLimit = Number(searchParams.get('limit'))
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_ORDER_PAGE_SIZE)
      : DEFAULT_ORDER_PAGE_SIZE

    const requestedPage = Number(searchParams.get('page'))
    const page = Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.floor(requestedPage)
      : 1

    // `status` was accepted by the client hooks all along but never read here,
    // so a filtered request silently returned everything.
    const statusParam = searchParams.get('status')
    const VALID: OrderStatus[] = [
      'PENDING', 'CONFIRMED', 'PROCESSING', 'IN_DELIVERY', 'DELIVERED', 'CANCELLED',
    ]
    const statusFilter =
      statusParam && VALID.includes(statusParam as OrderStatus)
        ? { status: statusParam as OrderStatus }
        : {}

    const where = {
      ...(isStaff ? {} : { userId: user.id }),
      ...statusFilter,
    }

    const total = await prisma.order.count({ where })

    const orders = await prisma.order.findMany({
      where,
      take: limit,
      skip: (page - 1) * limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                // Needed to rebuild a cart line for "order again": the cart
                // keys on the slug and checkout sends the id, and the two
                // availability flags decide whether the item can be re-added
                // at all rather than failing at checkout.
                slug: true,
                titleEn: true,
                titleAr: true,
                price: true,
                salePrice: true,
                images: true,
                isActive: true,
                // Per-pair rows, not a single number. A nested select is NOT
                // type-checked the way a top-level one is — `stock: true`
                // survived tsc here and only failed when Prisma ran it.
                variants: { select: { size: true, color: true, stock: true } },
              },
            },
          },
        },
        // Lets the dashboard flag payments that need manual reconciliation.
        paymentIntent: { select: { status: true, failureReason: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Matches the PaginatedResponse contract already declared in types/api.ts,
    // which the client hooks assumed but no endpoint ever honoured.
    return noStoreJson({
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    return noStoreJson(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

// POST /api/orders - Create order (authenticated customer)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return noStoreJson({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { items, notes, phone, location, userId: targetUserId } = body

    // Payment method is the only payment-related field accepted from the client.
    // Amounts are always derived server-side from the database below.
    const paymentMethod: 'COD' | 'WAYLE' =
      body.paymentMethod === 'WAYLE' ? 'WAYLE' : 'COD'

    // Validated against the known locales rather than interpolated raw — this
    // value ends up inside a URL handed to the payment provider.
    const returnLocale = body.locale === 'en' ? 'en' : 'ar'

    if (!phone?.trim()) {
      return noStoreJson(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    if (!location?.trim()) {
      return noStoreJson(
        { error: 'Delivery location is required' },
        { status: 400 }
      )
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return noStoreJson(
        { error: 'Order must contain at least one item' },
        { status: 400 }
      )
    }

    // Validate items and calculate the basket subtotal (before any discount).
    let subtotal = 0
    const orderItemsData: { productId: string; quantity: number; price: number; size: string | null; color: string | null }[] = []
    const lineItemSources: { label: string; amountUsd: number; image: string | null }[] = []
    // Demand is accumulated per PAIR — product, size and colour together.
    // Keyed by product alone, two lines for two different sizes of one shoe
    // were checked against the same pool, which is what let the shop sell a
    // size it did not have.
    const requestedByVariant = new Map<string, number>()

    // Validate the shapes before touching the database, so a malformed basket
    // costs nothing.
    for (const item of items) {
      if (!item?.productId || !item?.quantity || item.quantity < 1) {
        return noStoreJson(
          { error: 'Each item must have a valid productId and quantity' },
          { status: 400 }
        )
      }
    }

    // ONE query for the whole basket. This ran `findUnique` per line, awaited in
    // sequence, fetching the entire product row each time — so a five-item cart
    // paid five sequential round-trips to a remote Postgres before the order
    // transaction had even opened, on the single most latency-sensitive request
    // in the app.
    const basketProducts = await prisma.product.findMany({
      where: { id: { in: [...new Set(items.map((i: { productId: string }) => i.productId))] } },
      select: {
        id: true,
        titleEn: true,
        titleAr: true,
        price: true,
        salePrice: true,
        images: true,
        isActive: true,
        variants: { select: { size: true, color: true, stock: true } },
      },
    })
    const productById = new Map(basketProducts.map((p) => [p.id, p]))

    for (const item of items) {
      const { productId, quantity, size, color } = item

      const product = productById.get(productId)

      if (!product) {
        return noStoreJson(
          { error: `Product not found: ${productId}` },
          { status: 404 }
        )
      }

      if (!product.isActive) {
        return noStoreJson(
          { error: `Product is not available: ${product.titleEn}` },
          { status: 400 }
        )
      }

      // Which pair this line is for. A line with no size or colour cannot be
      // matched to stock at all, and guessing would put the shop right back to
      // selling whatever it felt like.
      if (!size || !color) {
        return noStoreJson(
          { error: `Choose a size and colour for ${product.titleEn}` },
          { status: 400 }
        )
      }

      const variant = product.variants.find(
        (v) => v.size === size && v.color === color
      )

      if (!variant) {
        return noStoreJson(
          { error: `${product.titleEn} is not sold in ${size} / ${color}` },
          { status: 400 }
        )
      }

      // Accumulated across lines, not read fresh each time. One basket can name
      // the same pair twice, and checking each line against the untouched row
      // let two lines of one unit each both pass with a single unit in stock —
      // the conditional decrement then refused the second and rolled the whole
      // order back as a 409, after the order row and coupon claim were written.
      // Nothing had gone out of stock; the basket was never fulfillable and
      // this check should have said so.
      //
      // Still advisory: the conditional updateMany further down is what
      // actually prevents overselling under concurrency. This only makes the
      // rejection accurate and early.
      const pairKey = variantKey(size, color)
      const key = `${productId}::${pairKey}`
      const totalRequested = (requestedByVariant.get(key) ?? 0) + quantity

      if (variant.stock < totalRequested) {
        return noStoreJson(
          {
            error: `Insufficient stock for ${product.titleEn} (${size} / ${color}). Available: ${variant.stock}`,
          },
          { status: 400 }
        )
      }

      requestedByVariant.set(key, totalRequested)

      const itemPrice = product.salePrice ?? product.price
      subtotal += itemPrice * quantity

      orderItemsData.push({
        productId,
        quantity,
        price: itemPrice,
        size: size || null,
        color: color || null,
      })

      // The variant belongs in the label. Wayle's hosted page lists one row per
      // line, so two sizes of the same shoe rendered as the same name twice with
      // nothing to tell them apart. Labels take no part in the amount
      // arithmetic, so this cannot disturb the sum Wayle validates.
      const variantLabel = [size, color].filter(Boolean).join(" / ")

      lineItemSources.push({
        label: variantLabel
          ? `${product.titleAr || product.titleEn} — ${variantLabel}`
          : product.titleAr || product.titleEn,
        amountUsd: itemPrice * quantity,
        image: product.images?.[0] ?? null,
      })
    }

    subtotal = roundMoney(subtotal)

    // --- Coupon ---
    //
    // The client sends a CODE and nothing else. The discount is resolved here,
    // from the database, against a subtotal this endpoint computed itself — the
    // checkout's preview (POST /api/coupons/validate) is a display convenience
    // and is never trusted. Anything the client claims about the discount, the
    // subtotal or the total is ignored.
    const requestedCode = normaliseCode(body.couponCode)
    let coupon: Awaited<ReturnType<typeof prisma.coupon.findUnique>> = null
    let discount = 0

    if (requestedCode) {
      coupon = await prisma.coupon.findUnique({ where: { code: requestedCode } })

      if (!coupon) {
        return noStoreJson(
          { error: 'This code is not valid.', reason: 'NOT_FOUND' },
          { status: 422 }
        )
      }

      const userRedemptions = await prisma.couponRedemption.count({
        where: { couponId: coupon.id, userId: user.id, voidedAt: null },
      })

      try {
        discount = assertCouponUsable({ coupon, subtotal, userRedemptions })
      } catch (error) {
        if (error instanceof CouponError) {
          return noStoreJson(
            { error: error.message, reason: error.reason, ...error.detail },
            { status: 422 }
          )
        }
        throw error
      }
    }

    const total = roundMoney(subtotal - discount)

    // For online payment, convert and enforce Wayle's floor BEFORE creating
    // anything — so a below-minimum order never becomes a half-built record.
    let amountIqd = 0
    let discountIqd = 0
    let lineItemAmountsIqd: number[] = []
    // Resolved lazily inside the online-payment branch only. Hoisting this out
    // meant a malformed USD_TO_IQD_RATE threw for CASH orders too, 500-ing
    // every checkout in a shop that may not even take online payment.
    let usdToIqdRate = 0

    // Reclaim stock from checkouts that were started and abandoned. This runs
    // for COD orders too: hanging it off the WAYLE branch alone meant a shop
    // that mostly takes cash never swept, so one abandoned online checkout
    // could hold its stock indefinitely. A scheduler can also call
    // POST /api/payments/expire so quiet periods still get swept.
    const releasedCount = await releaseExpiredIntents().catch((error) => {
      console.error('Expiry sweep failed (continuing)', error)
      return 0
    })
    if (releasedCount > 0) {
      console.info(`Released ${releasedCount} abandoned payment reservation(s)`)
    }

    if (paymentMethod === 'WAYLE') {
      usdToIqdRate = getUsdToIqdRate()

      // Round each line item FIRST, then sum, so the amounts Wayle receives add
      // up to the total exactly. Rounding the USD total separately would drift
      // by a dinar against the summed line items at any rate that does not
      // divide 2-decimal prices evenly (1500 happens to; 1310 does not).
      lineItemAmountsIqd = lineItemSources.map((source) =>
        usdToIqd(source.amountUsd, usdToIqdRate)
      )
      const grossIqd = lineItemAmountsIqd.reduce((sum, amount) => sum + amount, 0)

      // The discount is converted and subtracted in IQD, then sent to Wayle as
      // its own `decrease` line. Converting the already-discounted USD total
      // instead would leave the line items Wayle displays adding up to more
      // than the amount it collects, and Wayle rejects that mismatch.
      //
      // Clamped to the gross so a fixed-amount coupon worth more than the
      // basket cannot produce a negative charge.
      discountIqd =
        discount > 0
          ? Math.min(usdToIqd(discount, usdToIqdRate), grossIqd)
          : 0

      amountIqd = grossIqd - discountIqd
      try {
        assertAboveWayleMinimum(amountIqd)
      } catch (error) {
        if (error instanceof WayleMinimumAmountError) {
          return noStoreJson(
            {
              error: 'Order total is below the online payment minimum.',
              code: error.code,
              minimumIqd: WAYLE_MIN_AMOUNT_IQD,
              amountIqd: error.amountIQD,
            },
            { status: 400 }
          )
        }
        throw error
      }
    }

    const isStaff = user.role === 'ADMIN' || user.role === 'EMPLOYEE'
    const orderUserId = isStaff && targetUserId ? targetUserId : user.id

    // Auto-save the phone to the profile if it is not set yet.
    //
    // Deliberately OUTSIDE the order transaction: it is a convenience unrelated
    // to order correctness, and every extra round-trip inside an interactive
    // transaction is held against its timeout. Under concurrency those
    // round-trips queue behind row locks and the whole transaction expires —
    // which is exactly how checkout started failing with
    // "A query cannot be executed on an expired transaction".
    await prisma.user
      .updateMany({
        where: { id: orderUserId, OR: [{ phone: null }, { phone: '' }] },
        data: { phone: phone.trim() },
      })
      .catch((error) => {
        // Never fail an order because we could not cache a phone number.
        console.error('Could not save phone to profile (continuing)', error)
      })

    // Create order with items in a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Decrement stock for each product.
      //
      // The availability check above runs before the transaction opens, so two
      // concurrent checkouts on the last unit would both pass it. Guarding the
      // update on `stock >= quantity` makes the decrement itself atomic: the
      // loser matches 0 rows and we abort the whole transaction rather than
      // driving stock negative.
      for (const item of orderItemsData) {
        // The validation above rejects a line without a pair, so this cannot
        // fire in practice — but stock must never be claimed against a pair
        // nobody named, so it aborts rather than trusting that.
        if (!item.size || !item.color) {
          throw new InsufficientStockError(item.productId)
        }

        const claimed = await tx.productVariant.updateMany({
          where: {
            productId: item.productId,
            size: item.size,
            color: item.color,
            stock: { gte: item.quantity },
          },
          data: { stock: { decrement: item.quantity } },
        })

        if (claimed.count === 0) {
          throw new InsufficientStockError(item.productId)
        }
      }

      const created = await tx.order.create({
        data: {
          userId: orderUserId,
          subtotal,
          discount,
          total,
          couponId: coupon?.id ?? null,
          // Snapshot of the code, so the order still explains itself if the
          // coupon is later renamed or deleted.
          couponCode: coupon?.code ?? null,
          notes: notes || null,
          phone: phone.trim(),
          location: location.trim(),
          paymentMethod,
          // Stock is reserved at this point for both methods. COD collects on
          // delivery; WAYLE waits for the webhook to flip this to PAID.
          paymentStatus: paymentMethod === 'WAYLE' ? 'PENDING' : 'UNPAID',
          items: {
            create: orderItemsData,
          },
        },
        // No `include` here on purpose. Joining the products back in doubles
        // the work done while the transaction (and its row locks) are open; the
        // full shape is re-read after the commit instead.
        select: { id: true },
      })

      // Consume the coupon in the SAME transaction as the order.
      //
      // Outside it, a coupon could be burned by an order that then failed to
      // insert (or whose stock claim lost a race), permanently costing the
      // shopper a redemption for an order that never existed. This also closes
      // the reverse: the limit checks above only read, so two shoppers racing
      // for the last redemption both passed them — the conditional increment
      // inside claimCouponRedemption is what lets exactly one through.
      if (coupon && discount > 0) {
        await claimCouponRedemption(tx, {
          couponId: coupon.id,
          userId: orderUserId,
          orderId: created.id,
          amount: discount,
          maxRedemptions: coupon.maxRedemptions,
          maxPerUser: coupon.maxPerUser,
        })
      }

      return created
    }, {
      // Defaults are maxWait 2s / timeout 5s, which a remote pooled Postgres
      // cannot honour once several checkouts contend for the same product row:
      // the losers sat on a lock and then died with "expired transaction",
      // 500-ing a checkout that should simply have been told "out of stock".
      maxWait: 10_000,
      timeout: 20_000,
    })

    // Re-read outside the transaction, in the shape callers expect.
    const orderWithItems = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, titleEn: true, titleAr: true, images: true },
            },
          },
        },
      },
    })

    // Cash on delivery is complete once the order exists.
    if (paymentMethod === 'COD') {
      return noStoreJson(orderWithItems ?? order, { status: 201 })
    }

    // Online payment: issue the hosted Wayle link.
    //
    // Deliberately outside the transaction above — holding a database
    // transaction open across an external HTTP call would pin a connection for
    // the duration of Wayle's response time. If the call fails we compensate
    // explicitly instead, releasing the stock we just reserved.
    const referenceId = generateReferenceId()

    try {
      const siteUrl = getSiteUrl()

      const intent = await prisma.paymentIntent.create({
        data: {
          referenceId,
          orderId: order.id,
          userId: orderUserId,
          amountIqd,
          amountUsd: total,
          rateUsdToIqd: usdToIqdRate,
          status: 'PENDING',
        },
      })

      const link = await createPaymentLink({
        referenceId,
        totalIqd: amountIqd,
        lineItems: [
          ...lineItemSources.map((source, index) => ({
            label: source.label,
            // Reuse the exact figures summed into amountIqd above — never
            // recompute, or the parts stop matching the whole.
            amount: lineItemAmountsIqd[index],
            type: 'increase' as const,
            // Wayle rejects line items without an image URL, so fall back to the
            // site logo when a product has no image of its own.
            image: source.image
              ? source.image.startsWith('http')
                ? source.image
                : `${siteUrl}${source.image}`
              : `${siteUrl}/images/logo/logo.svg`,
          })),
          // The discount rides as its own decrease line so the figures Wayle
          // shows the payer still sum to the amount it charges.
          ...(discountIqd > 0
            ? [
                {
                  label: coupon?.code ? `خصم (${coupon.code})` : 'خصم',
                  amount: discountIqd,
                  type: 'decrease' as const,
                  image: `${siteUrl}/images/logo/logo.svg`,
                },
              ]
            : []),
        ],
        webhookUrl: `${siteUrl}/api/payments/wayle/webhook`,
        // Locale-prefixed on purpose: the return page lives under /[locale],
        // so an unprefixed URL bounces every payer onto the default locale.
        redirectionUrl: `${siteUrl}/${returnLocale}/checkout/return`,
      })

      await prisma.paymentIntent.update({
        where: { id: intent.id },
        data: { providerPaymentId: link.id, paymentUrl: link.url },
      })

      return noStoreJson(
        { ...(orderWithItems ?? order), referenceId, paymentUrl: link.url },
        { status: 201 }
      )
    } catch (error) {
      // Could not take payment — release the reserved stock and void the order
      // rather than leaving an unpayable record behind.
      console.error('Wayle link creation failed, rolling back order', error)

      await prisma
        .$transaction(async (tx) => {
          const voided = await tx.order.updateMany({
            where: { id: order.id, paymentStatus: 'PENDING' },
            data: { paymentStatus: 'FAILED' },
          })
          if (voided.count === 0) return

          await cancelOrderAndReleaseStock(tx, order.id)

          await tx.paymentIntent.updateMany({
            where: { referenceId },
            data: { status: 'FAILED', failureReason: 'LINK_CREATION_FAILED' },
          })
        })
        .catch((rollbackError) => {
          console.error('Order rollback failed', rollbackError)
        })

      return noStoreJson(
        { error: 'Could not start the online payment. Please try again or choose cash on delivery.' },
        { status: 502 }
      )
    }
  } catch (error) {
    // A coupon exhausted between validation and the atomic claim is a client
    // condition too. Without this the losers of a race for the last redemption
    // got a 500, which reads as "the shop is broken" rather than "that code is
    // used up".
    if (error instanceof CouponError) {
      return noStoreJson(
        { error: error.message, reason: error.reason, ...error.detail },
        { status: 422 }
      )
    }

    // Losing a stock race is a client-visible condition, not a server fault.
    if (error instanceof InsufficientStockError) {
      return noStoreJson(
        { error: 'One of the items just went out of stock. Please review your cart.' },
        { status: 409 }
      )
    }

    console.error('Error creating order:', error)
    return noStoreJson(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
