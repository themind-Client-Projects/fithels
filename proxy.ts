import NextAuth from "next-auth"
import createMiddleware from 'next-intl/middleware'
import authConfig from "@/lib/auth.config"
import { routing } from "@/i18n/routing"

const intlMiddleware = createMiddleware(routing)

const { auth } = NextAuth(authConfig)

/**
 * Renamed from `middleware.ts` in Next.js 16, which deprecated that filename.
 *
 * `proxy` always runs on the Node.js runtime — the edge runtime is not
 * supported here. That suits this file: lib/auth.config.ts was already written
 * to be edge-safe (no Prisma, providers and callbacks only) precisely because
 * the old middleware ran on the edge, so nothing is lost by moving off it.
 *
 * The function is named `proxy` as the guide recommends, even though it is a
 * default export.
 */
export default auth(function proxy(req) {
  // The authorized callback in auth.config.ts handles protection.
  // If we reach here, the request is either public or authenticated.
  return intlMiddleware(req)
})

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
}
