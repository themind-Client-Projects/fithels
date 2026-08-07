import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-utils'

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

    return NextResponse.json(order, { status: 201 })
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
