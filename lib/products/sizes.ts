/**
 * The shop's canonical size run.
 *
 * `Product.sizes` is a plain `String[]` holding only the sizes a product is
 * stocked in, so a product carrying `['38','39']` used to render a two-button
 * row — the shopper could not tell whether 36 was sold out or had never been
 * made. Showing the full run and marking the gaps answers that.
 *
 * Sizes are stored as strings ('35'…'41'), so everything here
 * compares strings. Values are trimmed on the way in because they are typed by
 * hand in the admin form.
 */
export const CANONICAL_SIZES: readonly string[] = [
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
];

/**
 * EU → foot length → US women's, from the shop's own chart.
 *
 * These are supplied values, not derived ones. An earlier version carried a UK
 * column and US/CM figures interpolated from a partial chart; when the real
 * chart arrived every US value was wrong (it read 4,5,6,7,8,9,10 against the
 * true 5,6,6.5,7.5,8.5,9,9.5) and the centimetres were out by up to 0.5. Nothing
 * here is calculated any more.
 *
 * The UK column is gone with them. It was interpolated from the same bad source
 * and the shop's chart does not give UK sizes, so there is nothing to restore it
 * from — a plausible-looking wrong number is worse than an absent one when a
 * shopper is choosing a size they cannot try on.
 *
 * `cm` is FOOT length, matching the chart's own "طول القدم" heading — the number
 * a shopper gets standing on a ruler, not the shoe's outer length.
 *
 * The EU column is exactly CANONICAL_SIZES, so the table and the size pills
 * cannot drift apart.
 */
export type SizeConversion = {
  eu: string;
  /** Foot length in centimetres, exactly as the shop's chart gives it. */
  cm: string;
  /** US women's sizing. */
  us: string;
};
export const SIZE_CONVERSIONS: readonly SizeConversion[] = [
  { eu: "35", cm: "22.0", us: "5" },
  { eu: "36", cm: "22.68", us: "6" },
  { eu: "37", cm: "23.35", us: "6.5" },
  { eu: "38", cm: "24.01", us: "7.5" },
  { eu: "39", cm: "24.68", us: "8.5" },
  { eu: "40", cm: "25.35", us: "9" },
  { eu: "41", cm: "26.01", us: "9.5" },
];

/**
 * Round a foot length to the nearest half centimetre for display.
 *
 * The chart gives figures like 22.68 and 26.01, which are more precision than
 * anyone measuring their own foot against a ruler can use — and the trailing
 * decimals made the column look like a calculation rather than a size guide.
 *
 * The exact values stay in SIZE_CONVERSIONS: this rounds on the way out, so the
 * shop's real chart is never overwritten by its own presentation. A whole number
 * loses its ".0" — "22" reads as a measurement, "22.0" as a reading.
 */
export function formatCm(cm: string | number): string {
  const value = Number(cm);
  if (!Number.isFinite(value)) return String(cm);
  const rounded = Math.round(value * 2) / 2;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
/**
 * Which sizes are ticked when a NEW product is created.
 *
 * Currently the whole run. Aliased rather than retyped so the two lists cannot
 * drift apart; the separate name is kept because the two answer different
 * questions — CANONICAL_SIZES is what the storefront DISPLAYS (gaps struck
 * through), this is what a new product is assumed to STOCK. If the shop ever
 * stops carrying one end of the run, only this changes.
 *
 * Only ever used to seed the create form. Editing an existing product always
 * shows that product's own sizes, including none.
 */
export const DEFAULT_PRODUCT_SIZES: readonly string[] = CANONICAL_SIZES;

export type SizeOption = {
  /** The size label, exactly as it is stored on the product. */
  size: string;
  /** True when the product actually carries this size. */
  available: boolean;
};

/**
 * The full run to render for a product, each entry flagged available or not.
 *
 * Any size the product carries that falls OUTSIDE the canonical run is appended
 * rather than dropped. Hiding a size the shop genuinely stocks would make it
 * unbuyable, which is a worse failure than showing an unusual one — so the
 * canonical list decides the order, never the membership.
 */
/**
 * @param isAvailable Optional. Decides whether a size the product is SOLD in is
 *   actually obtainable right now — on the product page that means "is there a
 *   pair of this size in the colour currently chosen". Without it a size counts
 *   as available merely for being listed, which is what let the page offer a
 *   size the shop had run out of.
 */
export function buildSizeOptions(
  productSizes?: readonly (string | number)[] | null,
  isAvailable?: (size: string) => boolean
): SizeOption[] {
  const stocked = new Set(
    (productSizes ?? [])
      .map((size) => String(size).trim())
      .filter((size) => size.length > 0)
  );

  const extras = [...stocked]
    .filter((size) => !CANONICAL_SIZES.includes(size))
    .sort((a, b) => {
      // Numeric where possible so '9' sorts before '10'; alphabetical otherwise
      // so lettered sizes (S/M/L) still land in a stable order.
      const na = Number(a);
      const nb = Number(b);
      if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
      return a.localeCompare(b);
    });

  return [...CANONICAL_SIZES, ...extras].map((size) => ({
    size,
    // Sold in this size AND obtainable. Both, because a size the shop has run
    // out of should read the same as one it never carried: not orderable.
    available: stocked.has(size) && (isAvailable?.(size) ?? true),
  }));
}
