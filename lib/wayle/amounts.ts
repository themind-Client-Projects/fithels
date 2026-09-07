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
 * NO LONGER ON THE CHARGE PATH. Products carry their own dinar price now, set
 * independently of the dollar one, and Wayle is handed those integers directly
 * — so nothing a customer pays is decided by this any more.
 *
 * It survives for reconciliation and for reporting, where a dollar figure with
 * no dinar twin still has to be shown in dinars. Do not reintroduce it into
 * pricing: converting was what limited every price to a multiple of 15 dinars
 * (one cent at 1500/USD) and billed an intended 59,000 IQD as 58,995.
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
