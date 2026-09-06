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

/**
 * SUPABASE RENAMED ITS KEYS, so both namings are accepted.
 *
 * What used to be the "anon key" (a JWT starting `eyJ`) is now the
 * "publishable key" (`sb_publishable_…`). The client library does not care:
 * reading the installed 2.106.2, the only check is `if (!supabaseKey) throw`,
 * and the value is passed straight through as the `apikey` header. So either
 * format works, and a deployment set up before or after the rename works
 * without anyone having to notice which one they have.
 *
 * The un-prefixed names are listed FIRST and are the better ones to use here.
 * `NEXT_PUBLIC_` inlines a value into the browser bundle, and this module is
 * imported by exactly one server route — so the prefix ships the key to every
 * visitor for no reason. It stays supported only so an existing deployment does
 * not break.
 *
 * The SECRET key (`sb_secret_…`, formerly the service-role key) is deliberately
 * NOT read here and must never be: it bypasses row-level security entirely, and
 * uploads have no need of it. It must also never be given a `NEXT_PUBLIC_`
 * prefix, which would publish it to every browser that loads the shop.
 */
const URL_VARS = [
  'SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
] as const

const KEY_VARS = [
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

const firstSet = (names: readonly string[]): string | undefined => {
  for (const name of names) {
    const value = process.env[name]
    if (value) return value
  }
  return undefined
}

/** True when a url and a key are present under any of their accepted names. */
export function isSupabaseConfigured(): boolean {
  return Boolean(firstSet(URL_VARS) && firstSet(KEY_VARS))
}

function getSupabaseClient(): SupabaseClient {
  if (client) return client

  const url = firstSet(URL_VARS)
  const key = firstSet(KEY_VARS)

  if (!url || !key) {
    // Every accepted name is listed, because "missing SUPABASE_URL" sends
    // someone hunting for a variable they may have set under another name.
    const missing = [
      !url && `a url (${URL_VARS.join(' or ')})`,
      !key && `a key (${KEY_VARS.join(' or ')})`,
    ].filter(Boolean)
    throw new Error(
      `Supabase is not configured — missing ${missing.join(' and ')}. ` +
        'Set these in the deployment environment.'
    )
  }

  client = createClient(url, key)
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
