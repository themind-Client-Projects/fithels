import { WAYLE_MIN_AMOUNT_IQD } from "./config";

/**
 * Thrown BEFORE any Wayle call when an order is below their 1000 IQD floor.
 * The checkout maps this to a localized message offering cash on delivery —
 * the payer must never see a raw gateway error.
 */
export class WayleMinimumAmountError extends Error {
  readonly code = "WAYLE_MIN_AMOUNT" as const;

  constructor(readonly amountIQD: number) {
    super(
      `Amount ${amountIQD} IQD is below the Wayle minimum of ${WAYLE_MIN_AMOUNT_IQD} IQD`
    );
    this.name = "WayleMinimumAmountError";
  }
}

/**
 * Convert a USD total to whole Iraqi dinars.
 *
 * Wayle charges exactly the integer we send, so this result — not the USD
 * figure — is what gets stored on the PaymentIntent and validated against the
 * webhook later.
 */
export function usdToIqd(amountUsd: number, rate: number): number {
  if (!Number.isFinite(amountUsd) || amountUsd < 0) {
    throw new Error(`Invalid USD amount: ${amountUsd}`);
  }
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error(`Invalid USD->IQD rate: ${rate}`);
  }
  return Math.round(amountUsd * rate);
}

/** Throws WayleMinimumAmountError when below Wayle's floor. */
export function assertAboveWayleMinimum(amountIqd: number): void {
  if (amountIqd < WAYLE_MIN_AMOUNT_IQD) {
    throw new WayleMinimumAmountError(amountIqd);
  }
}
