import NextAuth from "next-auth"
import createMiddleware from 'next-intl/middleware'
import authConfig from "@/lib/auth.config"
import { routing } from "@/i18n/routing"

const intlMiddleware = createMiddleware(routing)

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  // The authorized callback in auth.config.ts handles protection.
  // If we reach here, the request is either public or authenticated.
  return intlMiddleware(req)
})

export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
}
