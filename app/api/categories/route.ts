import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-utils'
import { translatePrismaError } from '@/lib/prisma-errors'
import { assertValidParent, CategoryTreeError } from '@/lib/categories/tree'

// GET /api/categories - List all categories with product count (public)
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          // children as well as products: the list groups by section and has to
          // know whether a row is a section before it can render it as one.
          select: { products: true, children: true },
        },
        parent: { select: { id: true, nameAr: true, nameEn: true } },
      },
      // Sorted by the Arabic name, which is what the dashboard displays.
      orderBy: { nameAr: 'asc' },
    })

    return NextResponse.json(categories)
  } catch (error) {
    if (error instanceof CategoryTreeError) {
      return NextResponse.json(
        { error: error.message, reason: error.reason },
        { status: error.status }
      )
    }
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
    const { nameEn, nameAr, slug, image, parentId } = body

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

    // Two-level rule lives in one place; see lib/categories/tree.
    await assertValidParent({ parentId: parentId || null })

    const category = await prisma.category.create({
      data: {
        nameEn,
        nameAr,
        slug,
        image: image || null,
        parentId: parentId || null,
      },
      include: {
        _count: { select: { products: true, children: true } },
        parent: { select: { id: true, nameAr: true, nameEn: true } },
      },
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    if (error instanceof CategoryTreeError) {
      return NextResponse.json(
        { error: error.message, reason: error.reason },
        { status: error.status }
      )
    }
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
