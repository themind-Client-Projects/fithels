import { noStoreJson } from '@/lib/api-response'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth-utils'

/**
 * GET /api/auth/me — the signed-in customer's own profile.
 *
 * Also returns the delivery details from their last order. Only the phone was
 * ever saved (on User), so a returning customer had their number filled in but
 * retyped their address on every single order — even though the shop already
 * knew where it had delivered to them last time.
 *
 * The address is read from the last ORDER rather than kept on the user record:
 * an order is a fact about where something was actually sent, so it stays
 * accurate without a second field to maintain, and a customer who moves simply
 * gets their newest address offered next time.
 */
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return noStoreJson({ error: 'Unauthorized' }, { status: 401 })
    }

    // Cancelled orders are excluded: an address that was never delivered to is
    // the weakest guess available, and a cancellation is often exactly because
    // it was wrong.
    const lastOrder = await prisma.order.findFirst({
      where: {
        userId: user.id,
        status: { not: 'CANCELLED' },
        location: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      select: { phone: true, location: true, createdAt: true },
    })

    return noStoreJson({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      // Null when they have never ordered — the checkout treats that as "no
      // saved details" rather than showing an empty saved-address card.
      lastDelivery: lastOrder
        ? {
            // Prefer the phone actually used on the order; fall back to the
            // profile, which is what the order form saved there in the first place.
            phone: lastOrder.phone || user.phone || '',
            location: lastOrder.location || '',
            orderedAt: lastOrder.createdAt,
          }
        : null,
    })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return noStoreJson({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}
