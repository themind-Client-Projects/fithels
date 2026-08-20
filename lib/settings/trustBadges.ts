import { prisma } from "@/lib/prisma";

/**
 * The shop-wide reassurance trio.
 *
 * ONE source of truth. The copy used to live in the translation files, which
 * meant a wording change was a developer edit and — the real problem — the
 * product page and the home page could end up stating different delivery terms.
 * Both surfaces read these rows now, so editing the delivery line in the
 * dashboard changes it everywhere it appears.
 */

/** The three fixed slots. The set does not grow from the admin. */
export const TRUST_SLOTS = ["PAYMENT", "COD", "DELIVERY"] as const;

export type TrustSlot = (typeof TRUST_SLOTS)[number];

export type TrustBadgeCopy = {
  slot: TrustSlot;
  titleAr: string;
  titleEn: string;
  textAr: string;
  textEn: string;
  isActive: boolean;
  order: number;
};

/**
 * What the shop says before anyone edits anything.
 *
 * Every line is something the code actually does — payment goes through the
 * provider's hosted page, cash on delivery is a real PaymentMethod, and 48 hours
 * is the term the shop gave. Defaults that promised more than that is how this
 * site ended up with a free-shipping bar the checkout never honoured.
 */
export const DEFAULT_TRUST_BADGES: TrustBadgeCopy[] = [
  {
    slot: "PAYMENT",
    titleAr: "دفع إلكتروني آمن",
    titleEn: "Secure online payment",
    textAr: "يتم الدفع عبر مزوّد دفع موثوق، ولا نحتفظ ببيانات بطاقتك.",
    textEn:
      "Handled by a trusted payment provider. We never store your card details.",
    isActive: true,
    order: 0,
  },
  {
    slot: "COD",
    titleAr: "الدفع عند الاستلام",
    titleEn: "Cash on delivery",
    textAr: "يمكنك الدفع نقدًا عند وصول طلبك.",
    textEn: "Pay in cash when your order arrives.",
    isActive: true,
    order: 1,
  },
  {
    slot: "DELIVERY",
    titleAr: "التوصيل",
    titleEn: "Delivery",
    textAr: "خلال مدة لا تتجاوز ٤٨ ساعة من تأكيد الطلب.",
    textEn: "Within 48 hours of order confirmation.",
    isActive: true,
    order: 2,
  },
];

/** Narrow untrusted input to a real slot; undefined for anything else. */
export function parseTrustSlot(value: unknown): TrustSlot | undefined {
  if (typeof value !== "string") return undefined;
  const upper = value.trim().toUpperCase();
  return (TRUST_SLOTS as readonly string[]).includes(upper)
    ? (upper as TrustSlot)
    : undefined;
}

/**
 * Read the trio for the storefront.
 *
 * Falls back to DEFAULT_TRUST_BADGES per slot, not all-or-nothing: a row that
 * has not been created yet still renders its default rather than leaving a hole
 * in a three-column band. Inactive rows are dropped.
 *
 * Never throws. This decorates two pages; a database hiccup should not take the
 * home page down with it, so a failed read falls through to the defaults.
 */
export async function getTrustBadges(): Promise<TrustBadgeCopy[]> {
  let rows: TrustBadgeCopy[] = [];
  try {
    rows = (await prisma.trustBadge.findMany({
      select: {
        slot: true,
        titleAr: true,
        titleEn: true,
        textAr: true,
        textEn: true,
        isActive: true,
        order: true,
      },
    })) as TrustBadgeCopy[];
  } catch {
    return DEFAULT_TRUST_BADGES;
  }

  const bySlot = new Map(rows.map((row) => [row.slot, row]));

  return DEFAULT_TRUST_BADGES.map(
    (fallback) => bySlot.get(fallback.slot) ?? fallback
  )
    .filter((badge) => badge.isActive)
    .sort((a, b) => a.order - b.order);
}
