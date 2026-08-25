import { NextRequest, NextResponse } from 'next/server'
import { normaliseVariants, withStockTotal } from '@/lib/products/variants'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-utils'
import {
  parsePrice,
  parseSalePrice,
  PricingValidationError,
} from '@/lib/products/pricing'
import { buildProductSlug } from '@/lib/products/slug'
import { translatePrismaError } from '@/lib/prisma-errors'

/** Hard ceiling so no caller can ask for the whole table. */
const MAX_PRODUCT_PAGE_SIZE = 100

// GET /api/products - List all products (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    // Deactivated products must not be public. This endpoint had no isActive
    // filter at all, so "deactivating" a product only delisted it from the
    // storefront pages while it stayed fully readable here — prices, images and
    // all — and the cart drawer served it as a recommendation.
    //
    // The dashboard genuinely needs the inactive ones, so it asks for them
    // explicitly and must be staff to get them.
    const wantsInactive = searchParams.get('includeInactive') === 'true'
    let includeInactive = false

    if (wantsInactive) {
      const user = await getAuthUser()
      if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      includeInactive = true
    }

    const where = {
      ...(includeInactive ? {} : { isActive: true }),
      ...(search
        ? {
            OR: [
              { titleEn: { contains: search, mode: 'insensitive' as const } },
              { titleAr: { contains: search, mode: 'insensitive' as const } },
              { descEn: { contains: search, mode: 'insensitive' as const } },
              { descAr: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    }

    // `limit` is opt-in so the dashboard's product table keeps working unchanged,
    // but there is now a hard ceiling: this had no `take` at all, so a storefront
    // widget wanting six tiles pulled the entire catalogue — every row, every
    // description, and the joined category — on every page that mounted it.
    const requestedLimit = Number(searchParams.get('limit'))
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, MAX_PRODUCT_PAGE_SIZE)
        : MAX_PRODUCT_PAGE_SIZE

    const products = await prisma.product.findMany({
      where,
      take: limit,
      include: { category: true, variants: true },
      orderBy: { createdAt: 'desc' },
    })

    // `stock` is answered as a derived total so every existing consumer — the
    // dashboard list, the order builder, the reorder button — keeps reading one
    // number, while the rows behind it stay the only stored truth.
    return NextResponse.json(products.map(withStockTotal))
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

    if (!titleEn || !titleAr || price === undefined || !categoryId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // What the shoe is sold in, settled before the stock rows are cleaned, so
    // a row for a size that was just unticked cannot slip through.
    const offeredSizes: string[] = Array.isArray(sizes) ? sizes : []
    const offeredColors: string[] = Array.isArray(colors) ? colors : []
    const variantRows = normaliseVariants(variants, offeredSizes, offeredColors)

    let parsedPrice: number
    let parsedSalePrice: number | null
    try {
      parsedPrice = parsePrice(price)
      parsedSalePrice = parseSalePrice(salePrice, parsedPrice)
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
        // Empty is stored as NULL, not '', so the storefront's "hide the section
        // when there is nothing to say" check is a single falsy test.
        sizeGuideEn: sizeGuideEn || null,
        sizeGuideAr: sizeGuideAr || null,
        deliveryEn: deliveryEn || null,
        deliveryAr: deliveryAr || null,
        price: parsedPrice,
        salePrice: parsedSalePrice,
        categoryId,
        sizes: offeredSizes,
        colors: offeredColors,
        // Rejected rather than stored if it names a pair the product is not
        // sold in; normaliseVariants also fills in a zero row for every pair
        // that has no number yet, so the grid always has something to show.
        variants: { createMany: { data: variantRows } },
        isActive: isActive ?? true,
        images: images || [],
      },
      include: { category: true, variants: true },
    })

    return NextResponse.json(withStockTotal(product), { status: 201 })
  } catch (error) {
    // A category that was deleted between the form loading and the save is the
    // caller's problem, not the server's — it used to surface as a bare 500
    // saying "Failed to create product", which told the admin nothing.
    const translated = translatePrismaError(error)
    if (translated) {
      return NextResponse.json(
        { error: translated.error, reason: translated.reason, field: translated.field },
        { status: translated.status }
      )
    }
    console.error('Error creating product:', error)
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    )
  }
}
