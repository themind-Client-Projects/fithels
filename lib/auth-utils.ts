import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * Get the currently authenticated user from the database.
 * Replaces the old `syncClerkUser()` function.
 *
 * Auth.js already created the user in the DB during the OAuth callback,
 * so this is just a simple lookup — no sync, no race conditions.
 */
export async function getAuthUser() {
  const session = await auth()

  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { permissions: true },
  })

  return user
}
