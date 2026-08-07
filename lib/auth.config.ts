import Google from "next-auth/providers/google"
import type { NextAuthConfig } from "next-auth"

/**
 * Auth.js config that is safe for Edge Runtime (middleware).
 * Contains ONLY providers and callbacks — NO PrismaAdapter, NO database imports.
 */
export default {
  providers: [
    Google({
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role ?? "CUSTOMER"
      }
      // NOTE: the role is deliberately NOT refreshable via `useSession().update()`.
      // That payload is fully client-controlled, so honouring it here would let any
      // signed-in user grant themselves ADMIN. Routes that need an authoritative
      // role must read it from the database via `getAuthUser()` (lib/auth-utils.ts).
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as any).role = token.role as string
      }
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const pathname = nextUrl.pathname
      const pathWithoutLocale = pathname.replace(/^\/(en|ar)/, '')
      const protectedPaths = ['/dashboard', '/account']
      const isProtected = protectedPaths.some(p => pathWithoutLocale.startsWith(p))

      if (isProtected && !isLoggedIn) {
        return false // Will redirect to pages.signIn
      }
      return true
    },
  },
} satisfies NextAuthConfig
