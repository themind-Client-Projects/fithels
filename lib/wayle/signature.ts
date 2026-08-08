import crypto from "crypto";

/** Header Wayle signs each webhook delivery with. */
export const WAYLE_SIGNATURE_HEADER = "x-wayl-signature-256";

/**
 * Verify a Wayle webhook signature.
 *
 * Three things this gets deliberately right:
 *
 * 1. It hashes the RAW body string, byte for byte as received. The caller must
 *    read `await request.text()` and verify BEFORE JSON.parse — re-serialising
 *    a parsed object produces different bytes (key order, whitespace) and every
 *    signature would fail.
 * 2. It compares with timingSafeEqual, never `===`.
 * 3. It length-checks first, because timingSafeEqual THROWS on mismatched
 *    lengths — and an uncaught throw becomes a 500, which gateways read as
 *    "retry forever".
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string
): boolean {
  if (!signature || !secret) return false;

  try {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("hex");

    const received = Buffer.from(signature.trim().toLowerCase(), "hex");
    const computed = Buffer.from(expected, "hex");

    if (received.length !== computed.length) return false;

    return crypto.timingSafeEqual(received, computed);
  } catch {
    return false;
  }
}
