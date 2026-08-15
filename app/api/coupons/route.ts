import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { noStoreJson } from '@/lib/api-response'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-utils'
import { normaliseCode } from '@/lib/coupons/validate'
import { parseCouponInput, CouponInputError } from '@/lib/coupons/input'
import { translatePrismaError } from '@/lib/prisma-errors'

const MAX_PAGE_SIZE = 100
const DEFAULT_PAGE_SIZE = 20

/**
 * GET /api/coupons — list coupons (staff only).
 *
 * Paginated from the start: the orders endpoint had to be retrofitted after it
 * started returning the whole table to render ten rows.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return noStoreJson({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)

    const requestedLimit = Number(searchParams.get('limit'))
    const limit =
      Number.isFinite(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, MAX_PAGE_SIZE)
        : DEFAULT_PAGE_SIZE

    const requestedPage = Number(searchParams.get('page'))
    const page =
      Number.isFinite(requestedPage) && requestedPage > 0
        ? Math.floor(requestedPage)
        : 1

    const search = (searchParams.get('search') ?? '').trim()
    const where: Prisma.CouponWhereInput = search
      ? { code: { contains: search, mode: 'insensitive' } }
      : {}

    const total = await prisma.coupon.count({ where })
    const coupons = await prisma.coupon.findMany({
      where,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { createdAt: 'desc' },
    })

    return noStoreJson({
      data: coupons,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (error) {
    const translated = translatePrismaError(error)
    if (translated) {
      return noStoreJson(
        { error: translated.error, reason: translated.reason, field: translated.field },
        { status: translated.status }
      )
    }
    console.error('Error listing coupons:', error)
    return noStoreJson({ error: 'Failed to load coupons' }, { status: 500 })
  }
}

/** POST /api/coupons — create a coupon (admin only). */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user || user.role !== 'ADMIN') {
      return noStoreJson(
        { error: 'Only administrators can create coupons.' },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => null)

    let data
    try {
      data = parseCouponInput(body)
    } catch (error) {
      if (error instanceof CouponInputError) {
        return noStoreJson(
          { error: error.message, reason: error.reason, field: error.field },
          { status: 400 }
        )
      }
      throw error
    }

    const code = normaliseCode(data.code)

    const existing = await prisma.coupon.findUnique({ where: { code } })
    if (existing) {
      // Say so explicitly. A raw unique-violation 500 sent admins looking for a
      // server fault when the real answer is "that code already exists".
      return noStoreJson(
        { error: `The code ${code} already exists.`, reason: 'DUPLICATE_CODE', field: 'code' },
        { status: 409 }
      )
    }

    const coupon = await prisma.coupon.create({ data: { ...data, code } })
    return noStoreJson(coupon, { status: 201 })
  } catch (error) {
    const translated = translatePrismaError(error)
    if (translated) {
      return noStoreJson(
        { error: translated.error, reason: translated.reason, field: translated.field },
        { status: translated.status }
      )
    }
    console.error('Error creating coupon:', error)
    return noStoreJson({ error: 'Failed to create coupon' }, { status: 500 })
  }
}
