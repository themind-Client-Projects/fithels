/**
 * Wayle configuration and environment validation.
 *
 * `getWayleConfig()` THROWS when a secret is missing rather than warning. That
 * matters most for the webhook route: a server running without
 * WAYLE_WEBHOOK_SECRET would otherwise have no key to verify signatures with,
 * and the only thing standing between an attacker and a forged "payment
 * completed" event would be every call site remembering to check. Routing all
 * access through this function means an unconfigured server refuses to process
 * payments at all instead of accepting unsigned ones.
 *
 * It is deliberately a function, not module-level top-level code, so that
 * building the app without payment credentials still works.
 */

import { getDisplayRate } from '@/lib/currency'

export interface WayleConfig {
  apiKey: string;
  webhookSecret: string;
  baseUrl: string;
}

/** Wayle refuses to issue a payment link below this amount. Their limit. */
export const WAYLE_MIN_AMOUNT_IQD = 1000;

/** Fallback matches the hardcoded rate in components/common/CurrencyFormatter.jsx. */
const DEFAULT_USD_TO_IQD_RATE = 1500;

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `${name} is not set. Wayle payments cannot be processed without it.`
    );
  }
  return value.trim();
}

export function getWayleConfig(): WayleConfig {
  return {
    apiKey: required("WAYLE_API_KEY"),
    webhookSecret: required("WAYLE_WEBHOOK_SECRET"),
    baseUrl: (process.env.WAYLE_BASE_URL || "https://api.wayl.one").replace(
      /\/+$/,
      ""
    ),
  };
}

/**
 * USD -> IQD rate used to bill the customer.
 *
 * Delegates to lib/currency so the figure Wayle charges is by construction the
 * same one the storefront and dashboard display. This used to read only
 * USD_TO_IQD_RATE with its own private default, so setting the money-critical
 * variable without the public one made the displayed and charged amounts
 * diverge silently — the exact drift the shared module was introduced to end.
 */
export function getUsdToIqdRate(): number {
  return getDisplayRate()
}

/** Public origin used to build webhook and redirect URLs. */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is not set. Wayle needs a publicly reachable webhook URL — localhost will not receive callbacks."
    );
  }
  return url.replace(/\/+$/, "");
}
