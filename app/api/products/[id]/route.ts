import { NextRequest, NextResponse } from 'next/server'
import { normaliseVariants, withStockTotal } from '@/lib/products/variants'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-utils'
import {
  parsePrice,
  parseSalePrice,
  PricingValidationError,
} from '@/lib/products/pricing'
import { translatePrismaError } from '@/lib/prisma-errors'

// GET /api/products/[id] - Get single product (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const product = await prisma.product.findUnique({
      where: { id },
      // Variants come too: the page decides which sizes are still
    // obtainable from them, and without the rows every size reads as sold out.
    include: { category: true, variants: true },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    const translated = translatePrismaError(error)
    if (translated) {
      return NextResponse.json(
        { error: translated.error, reason: translated.reason, field: translated.field },
        { status: translated.status }
      )
    }
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}

// PUT /api/products/[id] - Update product (ADMIN only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    // The rows come along: a save that changes only the sizes still has to
    // re-clean the stock it already holds against the new list.
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const {
      titleEn,
      titleAr,
      descEn,
      descAr,
      sizeGuideEn,
      sizeGuideAr,
      deliveryEn,
      deliveryAr,
      price,
      salePrice,
      categoryId,
      sizes,
      colors,
      variants,
      isActive,
      images,
    } = body

    // Partial update: a sale price can be edited without touching the price, so
    // it has to be checked against whatever the price will be after this save.
    const current = existing

    let parsedPrice: number | undefined
    let parsedSalePrice: number | null | undefined
    try {
      if (price !== undefined) parsedPrice = parsePrice(price)
      if (salePrice !== undefined) {
        parsedSalePrice = parseSalePrice(salePrice, parsedPrice ?? current.price)
      }

      // Lowering the price alone could otherwise leave an untouched sale price
      // sitting at or above it, which bills the customer more than the listing.
      if (
        parsedPrice !== undefined &&
        parsedSalePrice === undefined &&
        current.salePrice !== null &&
        current.salePrice >= parsedPrice
      ) {
        throw new PricingValidationError(
          'price',
          'PRICE_BELOW_EXISTING_SALE_PRICE',
          `This product has a sale price of ${current.salePrice}. The regular price must stay above it — update or clear the sale price first.`
        )
      }
    } catch (error) {
      if (error instanceof PricingValidationError) {
        return NextResponse.json(
          {
            error: error.message,
            code: error.code,
            reason: error.reason,
            field: error.field,
          },
          { status: 400 }
        )
      }
      throw error
    }

    // Cleaned against the sizes and colours the product will have AFTER this
    // save — not the ones it had before — so a pair whose size is being removed
    // in the same request cannot survive as an orphan row.
    const nextSizes: string[] = sizes !== undefined ? (Array.isArray(sizes) ? sizes : []) : existing.sizes
    const nextColors: string[] = colors !== undefined ? (Array.isArray(colors) ? colors : []) : existing.colors
    const variantRows =
      variants !== undefined || sizes !== undefined || colors !== undefined
        ? normaliseVariants(
            variants ?? existing.variants,
            nextSizes,
            nextColors
          )
        : undefined

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(titleEn !== undefined && { titleEn }),
        ...(titleAr !== undefined && { titleAr }),
        ...(descEn !== undefined && { descEn }),
        ...(descAr !== undefined && { descAr }),
        // `|| null` so clearing the textarea actually clears the column. Writing
        // '' would leave the storefront rendering an empty accordion section.
        ...(sizeGuideEn !== undefined && { sizeGuideEn: sizeGuideEn || null }),
        ...(sizeGuideAr !== undefined && { sizeGuideAr: sizeGuideAr || null }),
        ...(deliveryEn !== undefined && { deliveryEn: deliveryEn || null }),
        ...(deliveryAr !== undefined && { deliveryAr: deliveryAr || null }),
        ...(parsedPrice !== undefined && { price: parsedPrice }),
        ...(parsedSalePrice !== undefined && { salePrice: parsedSalePrice }),
        ...(categoryId !== undefined && { categoryId }),
        ...(sizes !== undefined && { sizes }),
        ...(colors !== undefined && { colors }),
        ...(isActive !== undefined && { isActive }),
        ...(images !== undefined && { images }),
        // REPLACED WHOLESALE, not merged. Unticking a colour has to take its
        // stock rows with it, or they keep counting towards what the shop
        // believes it can sell while no longer appearing anywhere to be
        // corrected. Both halves run inside the one update, so a failure
        // cannot leave the product with its old sizes and its new stock.
        ...(variantRows !== undefined && {
          variants: {
            deleteMany: {},
            createMany: { data: variantRows },
          },
        }),
      },
      include: { category: true, variants: true },
    })

    return NextResponse.json(withStockTotal(product))
  } catch (error) {
    const translated = translatePrismaError(error)
    if (translated) {
      return NextResponse.json(
        { error: translated.error, reason: translated.reason, field: translated.field },
        { status: translated.status }
      )
    }
    console.error('Error updating product:', error)
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    )
  }
}

// DELETE /api/products/[id] - Delete product (ADMIN only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await params

    const existing = await prisma.product.findUnique({
      where: { id },
      include: { _count: { select: { orderItems: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // OrderItem.product is a required relation with the default Restrict, so
    // deleting a product that was ever ordered raised a foreign-key error and
    // surfaced as a bare "Failed to delete product" — indistinguishable from a
    // database outage. Say what is actually blocking it.
    if (existing._count.orderItems > 0) {
      return NextResponse.json(
        {
          error: `This product appears in ${existing._count.orderItems} order(s) and cannot be deleted. Deactivate it instead.`,
          reason: 'PRODUCT_REFERENCED_BY_ORDERS',
          orderCount: existing._count.orderItems,
        },
        { status: 409 }
      )
    }

    await prisma.product.delete({ where: { id } })

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error) {
    const translated = translatePrismaError(error)
    if (translated) {
      return NextResponse.json(
        { error: translated.error, reason: translated.reason, field: translated.field },
        { status: translated.status }
      )
    }
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
