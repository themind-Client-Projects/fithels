import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import authConfig from "@/lib/auth.config"

/**
 * Full Auth.js config with PrismaAdapter for database operations.
 * Used by API routes and server components — NOT by middleware (Edge Runtime).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  events: {
    async createUser({ user }) {
      // When a brand-new user signs in for the first time,
      // ensure they get the CUSTOMER role in our DB
      if (user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "CUSTOMER" },
        })
      }
    },
  },
})
