import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-utils'
import {
  parsePrice,
  parseSalePrice,
  parseStock,
  PricingValidationError,
} from '@/lib/products/pricing'
import { buildProductSlug } from '@/lib/products/slug'

// GET /api/products - List all products (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    const where = search
      ? {
          OR: [
            { titleEn: { contains: search, mode: 'insensitive' as const } },
            { titleAr: { contains: search, mode: 'insensitive' as const } },
            { descEn: { contains: search, mode: 'insensitive' as const } },
            { descAr: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const products = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

// POST /api/products - Create product (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
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

    if (!titleEn || !titleAr || price === undefined || !categoryId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    let parsedPrice: number
    let parsedSalePrice: number | null
    let parsedStock: number
    try {
      parsedPrice = parsePrice(price)
      parsedSalePrice = parseSalePrice(salePrice, parsedPrice)
      parsedStock = parseStock(stock)
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

    // Auto-generate slug, transliterating Arabic rather than stripping it —
    // an Arabic title used to yield an empty slug, then '-1', '-2'.
    let baseSlug = buildProductSlug(titleEn, titleAr);
    let slug = baseSlug;
    let counter = 1;

    // Check for uniqueness
    while (await prisma.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const product = await prisma.product.create({
      data: {
        titleEn,
        titleAr,
        slug,
        descEn: descEn || null,
        descAr: descAr || null,
        price: parsedPrice,
        salePrice: parsedSalePrice,
        categoryId,
        sizes: sizes || [],
        colors: colors || [],
        stock: parsedStock,
        isActive: isActive ?? true,
        images: images || [],
      },
      include: { category: true },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
