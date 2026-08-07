import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-utils'

/**
 * GET /api/auth/permissions
 * 
 * Returns the current user's permissions and role.
 * Also ensures the user is synced to the database.
 */
export async function GET() {
  try {
    const user = await getAuthUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      permissions: user.permissions,
      role: user.role,
      userId: user.id,
    })
  } catch (error: any) {
    console.error('Error in /api/auth/permissions:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
