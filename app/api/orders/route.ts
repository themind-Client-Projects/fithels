import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

// GET /api/orders - List orders (role-based)
// ADMIN/EMPLOYEE: all orders | CUSTOMER: own orders only
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isStaff = user.role === 'ADMIN' || user.role === 'EMPLOYEE'

    const orders = await prisma.order.findMany({
      where: isStaff ? {} : { userId: user.id },
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
                titleEn: true,
                titleAr: true,
                price: true,
                salePrice: true,
                images: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    if (!location?.trim()) {
      return NextResponse.json(
        { error: 'Delivery location is required' },
        { status: 400 }
      )
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Order must contain at least one item' },
        { status: 400 }
      )
    }

    // Validate items and calculate total
    let total = 0
    const orderItemsData: { productId: string; quantity: number; price: number; size: string | null; color: string | null }[] = []
    const lineItemSources: { label: string; amountUsd: number; image: string | null }[] = []

    for (const item of items) {
      const { productId, quantity, size, color } = item

      if (!productId || !quantity || quantity < 1) {
        return NextResponse.json(
          { error: 'Each item must have a valid productId and quantity' },
          { status: 400 }
        )
      }

      const product = await prisma.product.findUnique({
        where: { id: productId },
      })

      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${productId}` },
          { status: 404 }
        )
      }

      if (!product.isActive) {
        return NextResponse.json(
          { error: `Product is not available: ${product.titleEn}` },
          { status: 400 }
        )
      }

      if (product.stock < quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.titleEn}. Available: ${product.stock}` },
          { status: 400 }
        )
      }

      const itemPrice = product.salePrice ?? product.price
      total += itemPrice * quantity

      orderItemsData.push({
        productId,
        quantity,
        price: itemPrice,
        size: size || null,
        color: color || null,
      })

      lineItemSources.push({
        label: product.titleAr || product.titleEn,
        amountUsd: itemPrice * quantity,
        image: product.images?.[0] ?? null,
      })
    }

    // For online payment, convert and enforce Wayle's floor BEFORE creating
    // anything — so a below-minimum order never becomes a half-built record.
    let amountIqd = 0
    let lineItemAmountsIqd: number[] = []
    const usdToIqdRate = getUsdToIqdRate()

    if (paymentMethod === 'WAYLE') {
      // Reclaim stock from checkouts that were started and abandoned, before we
      // reserve any more of it.
      await releaseExpiredIntents().catch((error) => {
        console.error('Expiry sweep failed (continuing)', error)
      })

      // Round each line item FIRST, then sum, so the amounts Wayle receives add
      // up to the total exactly. Rounding the USD total separately would drift
      // by a dinar against the summed line items at any rate that does not
      // divide 2-decimal prices evenly (1500 happens to; 1310 does not).
      lineItemAmountsIqd = lineItemSources.map((source) =>
        usdToIqd(source.amountUsd, usdToIqdRate)
      )
      amountIqd = lineItemAmountsIqd.reduce((sum, amount) => sum + amount, 0)
      try {
        assertAboveWayleMinimum(amountIqd)
      } catch (error) {
        if (error instanceof WayleMinimumAmountError) {
          return NextResponse.json(
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
        const claimed = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        })

        if (claimed.count === 0) {
          throw new InsufficientStockError(item.productId)
        }
      }

      // Create the order
      const isStaff = user.role === 'ADMIN' || user.role === 'EMPLOYEE'
      const orderUserId = isStaff && targetUserId ? targetUserId : user.id

      // Auto-save phone to user profile if not set
      const orderUser = await tx.user.findUnique({ where: { id: orderUserId } })
      if (orderUser && !orderUser.phone && phone) {
        await tx.user.update({
          where: { id: orderUserId },
          data: { phone: phone.trim() },
        })
      }

      return tx.order.create({
        data: {
          userId: orderUserId,
          total,
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
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  titleEn: true,
                  titleAr: true,
                  images: true,
                },
              },
            },
          },
        },
      })
    })

    // Cash on delivery is complete once the order exists.
    if (paymentMethod === 'COD') {
      return NextResponse.json(order, { status: 201 })
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
          userId: order.userId,
          amountIqd,
          amountUsd: total,
          rateUsdToIqd: usdToIqdRate,
          status: 'PENDING',
        },
      })

      const link = await createPaymentLink({
        referenceId,
        totalIqd: amountIqd,
        lineItems: lineItemSources.map((source, index) => ({
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
        webhookUrl: `${siteUrl}/api/payments/wayle/webhook`,
        // Locale-prefixed on purpose: the return page lives under /[locale],
        // so an unprefixed URL bounces every payer onto the default locale.
        redirectionUrl: `${siteUrl}/${returnLocale}/checkout/return`,
      })

      await prisma.paymentIntent.update({
        where: { id: intent.id },
        data: { providerPaymentId: link.id, paymentUrl: link.url },
      })

      return NextResponse.json(
        { ...order, referenceId, paymentUrl: link.url },
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

      return NextResponse.json(
        { error: 'Could not start the online payment. Please try again or choose cash on delivery.' },
        { status: 502 }
      )
    }
  } catch (error) {
    // Losing a stock race is a client-visible condition, not a server fault.
    if (error instanceof InsufficientStockError) {
      return NextResponse.json(
        { error: 'One of the items just went out of stock. Please review your cart.' },
        { status: 409 }
      )
    }

    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
