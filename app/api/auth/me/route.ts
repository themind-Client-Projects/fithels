import { NextResponse } from 'next/server'
import { noStoreJson } from '@/lib/api-response'
import { getAuthUser } from '@/lib/auth-utils'

// GET /api/auth/me - Get current user's profile info (phone, name, email)
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return noStoreJson({ error: 'Unauthorized' }, { status: 401 })
    }

    return noStoreJson({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return noStoreJson(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}
