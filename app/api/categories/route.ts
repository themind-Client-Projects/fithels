import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-utils'
import { translatePrismaError } from '@/lib/prisma-errors'

// GET /api/categories - List all categories with product count (public)
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      // Sorted by the Arabic name, which is what the dashboard displays.
      orderBy: { nameAr: 'asc' },
    })

    return NextResponse.json(categories)
  } catch (error) {
    const translated = translatePrismaError(error)
    if (translated) {
      return NextResponse.json(
        { error: translated.error, reason: translated.reason, field: translated.field },
        { status: translated.status }
      )
    }
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

// POST /api/categories - Create category (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { nameEn, nameAr, slug, image } = body

    if (!nameEn || !nameAr || !slug) {
      return NextResponse.json(
        { error: 'Missing required fields: nameEn, nameAr, slug' },
        { status: 400 }
      )
    }

    // Check slug uniqueness
    const existingSlug = await prisma.category.findUnique({ where: { slug } })
    if (existingSlug) {
      return NextResponse.json(
        { error: 'A category with this slug already exists' },
        { status: 409 }
      )
    }

    const category = await prisma.category.create({
      data: {
        nameEn,
        nameAr,
        slug,
        image: image || null,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    const translated = translatePrismaError(error)
    if (translated) {
      return NextResponse.json(
        { error: translated.error, reason: translated.reason, field: translated.field },
        { status: translated.status }
      )
    }
    console.error('Error creating category:', error)
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}
