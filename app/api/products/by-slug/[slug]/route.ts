import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/products/by-slug/[slug] - Get product by slug (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Public endpoint, so deactivated products must not be served. The list
    // endpoint was hardened for this; by-slug was missed, which left every
    // delisted product with a live, fully-priced, add-to-cart-able page.
    const product = await prisma.product.findFirst({
      where: { slug, isActive: true },
      // colorImages: the buy-now checkout shows the photo of the colour the
      // shopper actually picked, not the product's cover.
      include: { category: true, variants: true, colorImages: true },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error('Error fetching product by slug:', error)
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    )
  }
}
