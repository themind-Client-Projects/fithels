import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-utils'

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

    if (!titleEn || !titleAr || !price || !categoryId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Auto-generate slug from titleEn
    let baseSlug = titleEn.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
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
        price: parseFloat(price),
        salePrice: salePrice ? parseFloat(salePrice) : null,
        categoryId,
        sizes: sizes || [],
        colors: colors || [],
        stock: parseInt(stock, 10) || 0,
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
