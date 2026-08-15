import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase Storage client, created lazily.
 *
 * This used to call `createClient()` at module scope with `|| ''` fallbacks.
 * That looked defensive but wasn't: supabase-js throws `supabaseKey is
 * required.` on an empty key, so the module threw the moment it was imported.
 * Next.js imports every route handler during `next build` to collect page data,
 * so a missing env var turned into a hard build failure —
 * "Failed to collect configuration for /api/upload" — rather than a runtime
 * error on the one endpoint that actually needs storage.
 *
 * Constructing on first use keeps the import side-effect free: the build can
 * always load the module, and a misconfigured deployment fails at request time
 * with a message that names the missing variables.
 */
let client: SupabaseClient | null = null

/** True when both env vars are present, so callers can answer cleanly. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

function getSupabaseClient(): SupabaseClient {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    const missing = [
      !url && 'NEXT_PUBLIC_SUPABASE_URL',
      !anonKey && 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ].filter(Boolean)
    throw new Error(
      `Supabase is not configured — missing ${missing.join(' and ')}. ` +
        'Set these in the deployment environment.'
    )
  }

  client = createClient(url, anonKey)
  return client
}

/**
 * Proxy so existing `supabase.storage.from(...)` call sites keep working
 * unchanged, while the underlying client is only built on first property
 * access. Methods are bound to the real client so `this` stays correct.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const value = getSupabaseClient()[prop as keyof SupabaseClient]
    return typeof value === 'function' ? value.bind(getSupabaseClient()) : value
  },
})
