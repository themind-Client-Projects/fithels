import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-utils'

// GET /api/dashboard/stats - Dashboard statistics (ADMIN/EMPLOYEE only)
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user || (user.role !== 'ADMIN' && user.role !== 'EMPLOYEE')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const [totalOrders, totalRevenue, activeProducts, totalCustomers, recentOrders] =
      await Promise.all([
        // Total orders count
        prisma.order.count(),

        // Total revenue (sum of all order totals)
        prisma.order.aggregate({
          _sum: { total: true },
          where: {
            status: { not: 'CANCELLED' },
          },
        }),

        // Active products count
        prisma.product.count({
          where: { isActive: true },
        }),

        // Total customers count
        prisma.user.count({
          where: { role: 'CUSTOMER' },
        }),

        // Recent 5 orders with user info
        prisma.order.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
      ])

    return NextResponse.json({
      totalOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      activeProducts,
      totalCustomers,
      recentOrders,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
