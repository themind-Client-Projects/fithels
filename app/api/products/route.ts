import { NextRequest, NextResponse } from 'next/server'
import { normaliseVariants, withStockTotal } from '@/lib/products/variants'
import { deriveGallery, normaliseColorImages } from '@/lib/products/colorImages'
import { normaliseColorHex } from '@/lib/products/colors'
import { matchesSearch, normaliseForSearch } from '@/lib/search'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-utils'
import {
  parsePrice,
  parsePriceIqd,
  parseSalePrice,
  parseSalePriceIqd,
  PricingValidationError,
} from '@/lib/products/pricing'
import { buildProductSlug } from '@/lib/products/slug'
import { parseSizeSystem } from '@/lib/products/sizes'
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

    // Resolved once, for BOTH decisions below: which products are listed, and
    // how much of each one is described. The per-pair stock matrix is a sales
    // report — how many of every size in every colour, for the whole catalogue —
    // and this endpoint is public, so it is staff-only.
    const user = await getAuthUser()
    const isStaff = user?.role === 'ADMIN' || user?.role === 'EMPLOYEE'

    if (wantsInactive) {
      if (!isStaff) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      includeInactive = true
    }

    // The DB filter deliberately does NOT include `search`.
    //
    // Postgres `contains` compares the letters as stored, and Arabic is written
    // several ways for the same word: "احمد" (bare alef, what most phone
    // keyboards produce) never matched "أحمد", "اناقه" never matched "أناقة",
    // and any stored tashkeel made a title unsearchable outright. The shop is
    // Arabic-first, so that is not an edge case — it is most queries.
    //
    // matchesSearch already solves it (lib/search.ts) and is what the dashboard
    // tables use, so the match happens in JS below over the fetched rows.
    const where = {
      ...(includeInactive ? {} : { isActive: true }),
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

    const requestedOffset = Number(searchParams.get('offset'))
    const offset =
      Number.isFinite(requestedOffset) && requestedOffset > 0
        ? Math.floor(requestedOffset)
        : 0

    const needle = search ? normaliseForSearch(search) : ''

    /**
     * A search reads the catalogue and filters in memory; a plain list pages in
     * the database.
     *
     * Matching cannot be pushed into the query (see `where` above), so the rows
     * have to be here to be matched. SCAN_LIMIT bounds that read, and the
     * response says when it was hit rather than quietly returning a partial
     * answer as if it were the whole one.
     */
    const SCAN_LIMIT = 500

    const rows = needle
      ? await prisma.product.findMany({
          where,
          take: SCAN_LIMIT,
          include: { category: true, variants: true, colorImages: true },
          orderBy: { createdAt: 'desc' },
        })
      : await prisma.product.findMany({
          where,
          take: limit,
          skip: offset,
          include: { category: true, variants: true, colorImages: true },
          orderBy: { createdAt: 'desc' },
        })

    const matched = needle
      ? rows.filter(
          (p) =>
            matchesSearch(p.titleAr, needle) ||
            matchesSearch(p.titleEn, needle) ||
            matchesSearch(p.descAr, needle) ||
            matchesSearch(p.descEn, needle)
        )
      : rows

    // How many there are in total, so a caller can page without guessing. For a
    // search that is the matched count; otherwise the database counts.
    const total = needle ? matched.length : await prisma.product.count({ where })

    const products = needle ? matched.slice(offset, offset + limit) : matched

    // `stock` is answered as a derived total so every existing consumer — the
    // dashboard list, the order builder, the reorder button — keeps reading one
    // number, while the rows behind it stay the only stored truth.
    const withTotals = products.map(withStockTotal)

    /**
     * The count rides in a header, not the body.
     *
     * Every existing caller — the dashboard table, the order builder, the
     * search drawer — reads this response as a bare ARRAY. Wrapping it in
     * `{ items, total }` would be tidier and would break all three, so the
     * extra fact goes where it costs nothing.
     */
    const meta = {
      'X-Total-Count': String(total),
      'X-Scan-Truncated': String(Boolean(needle && rows.length === SCAN_LIMIT)),
    }

    if (isStaff) return NextResponse.json(withTotals, { headers: meta })

    /**
     * Public callers get the total and not the breakdown.
     *
     * The storefront needs to know whether a product can be bought at all — the
     * search drawer renders an "in stock" state from it — but nothing on the
     * storefront reads this endpoint's per-pair rows, and handing them out let
     * anyone read exact counts for every size and colour in the catalogue with
     * one unauthenticated request. Pages that DO need per-size availability
     * (the grid, the product page) query the database directly through
     * PRODUCT_CARD_SELECT and are unaffected.
     *
     * `descEn`/`descAr` go too: unbounded Text nobody renders from here.
     */
    return NextResponse.json(
      withTotals.map(({ variants: _variants, descEn: _descEn, descAr: _descAr, ...rest }) => rest),
      { headers: meta }
    )
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
      priceIqd,
      salePrice,
      salePriceIqd,
      categoryId,
      sizes,
      sizeSystem,
      colors,
      colorHex,
      variants,
      colorImages,
      isActive,
      images,
    } = body

    if (
      !titleEn ||
      !titleAr ||
      price === undefined ||
      // The dinar price is not optional: it is what the storefront shows and
      // what Wayle charges, and there is no rate to fall back on now that the
      // two currencies are set independently.
      priceIqd === undefined ||
      !categoryId
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // What the shoe is sold in, settled before the stock rows are cleaned, so
    // a row for a size that was just unticked cannot slip through.
    // Validated rather than trusted: an unknown value falls back to shoes,
    // which is what every product was before this existed.
    const system = parseSizeSystem(sizeSystem)
    const offeredSizes: string[] = Array.isArray(sizes) ? sizes : []
    const offeredColors: string[] = Array.isArray(colors) ? colors : []
    const variantRows = normaliseVariants(variants, offeredSizes, offeredColors)
    const colorImageRows = normaliseColorImages(colorImages, offeredColors)
    // Sanitised server-side: this value is written straight into a CSS
    // background-color, so it can never be taken from the request as-is.
    const swatches = normaliseColorHex(colorHex, offeredColors)
    // Derived, never taken from the client: the dashboard has one uploader now,
    // per colour, so the product gallery is whatever those add up to. A second
    // stored copy is a second thing to keep in step.
    const gallery = colorImageRows.length > 0
      ? deriveGallery(colorImageRows, offeredColors)
      : (Array.isArray(images) ? images : [])

    let parsedPrice: number
    let parsedSalePrice: number | null
    let parsedPriceIqd: number
    let parsedSalePriceIqd: number | null
    try {
      parsedPrice = parsePrice(price)
      parsedSalePrice = parseSalePrice(salePrice, parsedPrice)
      // Judged on its own terms, against the dinar price — not converted from
      // the dollar one, which is the whole point of holding both.
      parsedPriceIqd = parsePriceIqd(priceIqd)
      parsedSalePriceIqd = parseSalePriceIqd(salePriceIqd, parsedPriceIqd)
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
        priceIqd: parsedPriceIqd,
        colorHex: swatches,
        salePriceIqd: parsedSalePriceIqd,
        salePrice: parsedSalePrice,
        categoryId,
        sizeSystem: system,
        sizes: offeredSizes,
        colors: offeredColors,
        // Rejected rather than stored if it names a pair the product is not
        // sold in; normaliseVariants also fills in a zero row for every pair
        // that has no number yet, so the grid always has something to show.
        variants: { createMany: { data: variantRows } },
        colorImages: { createMany: { data: colorImageRows } },
        isActive: isActive ?? true,
        images: gallery,
      },
      include: { category: true, variants: true, colorImages: true },
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
