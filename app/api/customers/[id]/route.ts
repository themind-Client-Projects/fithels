import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-utils'

/** Raised when a change would leave the store with no administrator. */
class LastAdminError extends Error {
  constructor() {
    super('Cannot remove the last administrator')
    this.name = 'LastAdminError'
  }
}

class UserNotFoundError extends Error {
  constructor() {
    super('User not found')
    this.name = 'UserNotFoundError'
  }
}

// PUT /api/customers/[id] - Update customer details and role
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Only admins can manage roles' }, { status: 403 })
    }

    const { name, phone, role } = await request.json()
    const { id } = await params; // Next.js 15 requires awaiting params

    // Optional validation
    if (!role || !['ADMIN', 'EMPLOYEE', 'CUSTOMER'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Prevent changing your own role to avoid getting locked out
    if (user.id === id && role !== 'ADMIN') {
      return NextResponse.json({ error: 'You cannot downgrade your own admin privileges' }, { status: 400 })
    }

    // The self-demote guard above only stops an admin demoting THEMSELVES. Two
    // admins demoting each other at the same instant both passed it, both
    // committed, and the store was left with zero admins and no way back in
    // except database access. Counting and writing in one transaction, while
    // requiring the target to still be an admin, means only one can win.
    const updatedUser = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id },
        select: { role: true },
      })
      if (!target) throw new UserNotFoundError()

      if (target.role === 'ADMIN' && role !== 'ADMIN') {
        const remainingAdmins = await tx.user.count({
          where: { role: 'ADMIN', id: { not: id } },
        })
        if (remainingAdmins === 0) throw new LastAdminError()
      }

      return tx.user.update({
        where: { id },
        data: { name, phone, role },
      })
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (error instanceof LastAdminError) {
      return NextResponse.json(
        {
          error: 'This is the last administrator. Promote someone else before changing this role.',
          reason: 'LAST_ADMIN',
        },
        { status: 409 }
      )
    }
    console.error('Error updating customer:', error)
    return NextResponse.json(
      { error: 'Failed to update customer' },
      { status: 500 }
    )
  }
}

// DELETE /api/customers/[id] - Delete a customer
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Only admins can delete users' }, { status: 403 })
    }
    
    const { id } = await params;

    // Prevent self-deletion
    if (user.id === id) {
      return NextResponse.json({ error: 'You cannot delete your own admin account' }, { status: 400 })
    }

    // Order.user is a required relation defaulting to Restrict, so deleting a
    // customer with orders threw a foreign-key error that surfaced as a generic
    // "Failed to delete customer". The list even shows their order count next
    // to a delete button that could never work.
    // Same race as the role change: two admins deleting each other at once
    // both passed the self-delete guard and both committed.
    const target = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    })
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (target.role === 'ADMIN') {
      const remainingAdmins = await prisma.user.count({
        where: { role: 'ADMIN', id: { not: id } },
      })
      if (remainingAdmins === 0) {
        return NextResponse.json(
          {
            error: 'This is the last administrator and cannot be deleted.',
            reason: 'LAST_ADMIN',
          },
          { status: 409 }
        )
      }
    }

    const orderCount = await prisma.order.count({ where: { userId: id } })
    if (orderCount > 0) {
      return NextResponse.json(
        {
          error: `This customer has ${orderCount} order(s) and cannot be deleted.`,
          reason: 'CUSTOMER_HAS_ORDERS',
          orderCount,
        },
        { status: 409 }
      )
    }

    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting customer:', error)
    return NextResponse.json(
      { error: 'Failed to delete customer' },
      { status: 500 }
    )
  }
}
