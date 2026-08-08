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
 * USD -> IQD rate. Money-critical: this is the figure Wayle actually charges,
 * so the rate used is stored on every PaymentIntent for reconciliation.
 */
export function getUsdToIqdRate(): number {
  const raw = process.env.USD_TO_IQD_RATE;
  if (!raw) return DEFAULT_USD_TO_IQD_RATE;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `USD_TO_IQD_RATE must be a positive number, received "${raw}".`
    );
  }
  return parsed;
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
