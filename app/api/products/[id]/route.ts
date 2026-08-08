import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-utils'
import {
  parsePrice,
  parseSalePrice,
  parseStock,
  PricingValidationError,
} from '@/lib/products/pricing'

// GET /api/products/[id] - Get single product (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
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

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const {
      titleEn,
      titleAr,
      descEn,
      descAr,
      price,
      salePrice,
      categoryId,
      sizes,
      colors,
      stock,
      isActive,
      images,
    } = body

    // Partial update: a sale price can be edited without touching the price, so
    // it has to be checked against whatever the price will be after this save.
    const current = await prisma.product.findUnique({
      where: { id },
      select: { price: true, salePrice: true },
    })
    if (!current) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    let parsedPrice: number | undefined
    let parsedSalePrice: number | null | undefined
    let parsedStock: number | undefined
    try {
      if (price !== undefined) parsedPrice = parsePrice(price)
      if (salePrice !== undefined) {
        parsedSalePrice = parseSalePrice(salePrice, parsedPrice ?? current.price)
      }
      if (stock !== undefined) parsedStock = parseStock(stock)

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
          `This product has a sale price of ${current.salePrice}. The regular price must stay above it — update or clear the sale price first.`
        )
      }
    } catch (error) {
      if (error instanceof PricingValidationError) {
        return NextResponse.json(
          { error: error.message, code: error.code, field: error.field },
          { status: 400 }
        )
      }
      throw error
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(titleEn !== undefined && { titleEn }),
        ...(titleAr !== undefined && { titleAr }),
        ...(descEn !== undefined && { descEn }),
        ...(descAr !== undefined && { descAr }),
        ...(parsedPrice !== undefined && { price: parsedPrice }),
        ...(parsedSalePrice !== undefined && { salePrice: parsedSalePrice }),
        ...(categoryId !== undefined && { categoryId }),
        ...(sizes !== undefined && { sizes }),
        ...(colors !== undefined && { colors }),
        ...(parsedStock !== undefined && { stock: parsedStock }),
        ...(isActive !== undefined && { isActive }),
        ...(images !== undefined && { images }),
      },
      include: { category: true },
    })

    return NextResponse.json(product)
  } catch (error) {
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

    const existing = await prisma.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    await prisma.product.delete({ where: { id } })

    return NextResponse.json({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
