import { NextResponse } from 'next/server'
import { noStoreJson } from '@/lib/api-response'
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
      return noStoreJson({ error: 'Unauthorized' }, { status: 401 })
    }

    return noStoreJson({
      permissions: user.permissions,
      role: user.role,
      userId: user.id,
    })
  } catch (error: any) {
    console.error('Error in /api/auth/permissions:', error)
    return noStoreJson({ error: error.message }, { status: 500 })
  }
}
