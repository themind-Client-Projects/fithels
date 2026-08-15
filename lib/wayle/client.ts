import crypto from "crypto";
import { getWayleConfig } from "./config";

export interface WayleLineItem {
  label: string;
  amount: number;
  type: "increase" | "decrease";
  /** REQUIRED by Wayle — the API rejects line items without an image URL. */
  image: string;
}

export interface CreatePaymentLinkInput {
  referenceId: string;
  totalIqd: number;
  lineItems: WayleLineItem[];
  webhookUrl: string;
  redirectionUrl: string;
}

export interface WaylePaymentLink {
  referenceId: string;
  id: string;
  /** Wayle returns this as a STRING; parsed to a number here. */
  total: number;
  currency: string;
  status: string;
  url: string;
  paymentMethod?: string;
  completedAt?: string | null;
}

export class WayleApiError extends Error {
  readonly code = "WAYLE_API_ERROR" as const;

  constructor(
    message: string,
    readonly httpStatus?: number
  ) {
    super(message);
    this.name = "WayleApiError";
  }
}

/** Opaque reference id. Carries no encoded data — see PaymentIntent in schema. */
export function generateReferenceId(): string {
  return `ord_${crypto.randomBytes(16).toString("hex")}`;
}

/**
 * Create a hosted Wayle payment link.
 *
 * `totalIqd` is sent as-is in Iraqi dinars — callers must convert and apply the
 * minimum-amount guard beforehand.
 */
export async function createPaymentLink(
  input: CreatePaymentLinkInput
): Promise<WaylePaymentLink> {
  const config = getWayleConfig();

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/api/v1/links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-WAYL-AUTHENTICATION": config.apiKey,
      },
      body: JSON.stringify({
        referenceId: input.referenceId,
        total: input.totalIqd,
        currency: "IQD",
        lineItem: input.lineItems,
        webhookUrl: input.webhookUrl,
        webhookSecret: config.webhookSecret,
        redirectionUrl: input.redirectionUrl,
      }),
      cache: "no-store",
    });
  } catch (error: any) {
    throw new WayleApiError(`Could not reach Wayle: ${error?.message}`);
  }

  const text = await response.text();

  if (!response.ok) {
    // Never surface the raw provider body to the client — it can echo config.
    console.error("Wayle link creation failed", {
      status: response.status,
      body: text.slice(0, 500),
    });
    throw new WayleApiError(
      "Wayle rejected the payment link request",
      response.status
    );
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new WayleApiError("Wayle returned a non-JSON response");
  }

  const data = parsed?.data;
  if (!data?.url || !data?.id) {
    throw new WayleApiError("Wayle response is missing `data.url` or `data.id`");
  }

  return {
    referenceId: data.referenceId,
    id: data.id,
    total: Number(data.total), // arrives as a string
    currency: data.currency ?? "IQD",
    status: data.status,
    url: data.url,
    paymentMethod: data.paymentMethod,
    completedAt: data.completedAt ?? null,
  };
}

/** Statuses that mean "money actually captured". */
const ACCEPTED_STATUSES = [
  "COMPLETED",
  "SUCCESS",
  // Common synonyms across Iraqi gateways. Unambiguous: all three mean the
  // funds were captured, never "authorised" or "partially paid".
  "SUCCEEDED",
  "PAID",
  "CAPTURED",
  "SETTLED",
];

/**
 * Statuses that explicitly mean this payment will never complete, so the order
 * can safely be cancelled and its stock returned.
 */
const FAILED_STATUSES = [
  "FAILED",
  "FAILURE",
  "CANCELLED",
  "CANCELED",
  "DECLINED",
  "REJECTED",
  "EXPIRED",
  "VOIDED",
  "TIMEOUT",
  "ERROR",
];

/** Statuses that mean "not finished yet" — no action, no alarm. */
const PENDING_STATUSES = [
  "PENDING",
  "PROCESSING",
  "IN_PROGRESS",
  "INITIATED",
  "CREATED",
  "AWAITING_PAYMENT",
];

export type WebhookOutcome = "accepted" | "failed" | "pending" | "unknown";

/**
 * Classify a provider status into an action.
 *
 * The `unknown` case exists because the alternative is unacceptable. The
 * webhook previously branched on `isAcceptedStatus` alone, so ANY status it did
 * not recognise fell into the failure path and cancelled the order, released
 * the stock and returned the coupon — for a customer whose money had in fact
 * moved. A provider adding a status, or spelling one differently, was enough to
 * destroy paid orders silently, because the result was indistinguishable from a
 * genuine decline.
 *
 * This is the same principle the amount check already applies: a value we
 * cannot interpret is not the same as a value that is wrong. Unrecognised means
 * "stop and ask a human", never "cancel".
 */
export function classifyWebhookStatus(
  status: string | undefined
): WebhookOutcome {
  if (!status) return "unknown";
  const normalised = status.trim().toUpperCase();
  if (ACCEPTED_STATUSES.includes(normalised)) return "accepted";
  if (FAILED_STATUSES.includes(normalised)) return "failed";
  if (PENDING_STATUSES.includes(normalised)) return "pending";
  return "unknown";
}

export interface NormalisedWebhook {
  referenceId?: string;
  paymentId?: string;
  status?: string;
  amount: number;
  currency: string;
  completedAt?: string | null;
  paymentMethod?: string;
}

/** The webhook body is not perfectly consistent — normalise defensively. */
/**
 * Wayle sends amounts as strings, and formatted ones ("15,000") are realistic.
 * A bare Number() turns those into NaN, which downstream is indistinguishable
 * from "the amount is wrong" — and failing a payment that actually succeeded is
 * far worse than the formatting quirk itself.
 */
export function parseProviderAmount(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return NaN;

  const cleaned = value.trim().replace(/[\s,_]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return NaN;

  return Number(cleaned);
}

export function normaliseWebhookPayload(payload: any): NormalisedWebhook {
  return {
    referenceId: payload?.referenceId,
    paymentId: payload?.id,
    status: payload?.paymentStatus ?? payload?.status,
    amount: parseProviderAmount(payload?.total ?? payload?.amount),
    currency: payload?.currency ?? "IQD",
    completedAt: payload?.completedAt ?? null,
    paymentMethod: payload?.paymentMethod,
  };
}


