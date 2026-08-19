/**
 * Where a banner appears on the home page.
 *
 * Mirrors the BannerPlacement enum in the schema. Kept as a plain array so the
 * admin form, the API validation and the home page all read the same list —
 * a placement added to the schema but forgotten in one of those three is the
 * failure this prevents.
 */
export const BANNER_PLACEMENTS = [
  "HERO",
  "CATALOG",
  "COLLECTION",
  "SHOWCASE",
] as const;

export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number];

export const DEFAULT_BANNER_PLACEMENT: BannerPlacement = "HERO";

/**
 * Narrow untrusted input to a real placement.
 *
 * Returns undefined for anything unrecognised rather than falling back to a
 * default, so an update carrying a bad value leaves the column untouched
 * instead of silently moving a banner to a different part of the page.
 */
export function parseBannerPlacement(
  value: unknown
): BannerPlacement | undefined {
  if (typeof value !== "string") return undefined;
  const upper = value.trim().toUpperCase();
  return (BANNER_PLACEMENTS as readonly string[]).includes(upper)
    ? (upper as BannerPlacement)
    : undefined;
}
