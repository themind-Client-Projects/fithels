import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-utils'

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

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        phone,
        role,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
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
