/**
 * The shop's canonical size run.
 *
 * `Product.sizes` is a plain `String[]` holding only the sizes a product is
 * stocked in, so a product carrying `['38','39']` used to render a two-button
 * row — the shopper could not tell whether 36 was sold out or had never been
 * made. Showing the full run and marking the gaps answers that.
 *
 * Sizes are stored as strings ('35'…'41' in the seed), so everything here
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
  "42",
];

/**
 * EU → UK → US → foot length conversion for the size guide.
 *
 * Kept as data rather than markup so the table and the size pills cannot drift
 * apart: the EU column is exactly CANONICAL_SIZES. Women's shoe sizing, which is
 * what this shop sells.
 *
 * `cm` is the FOOT length the size fits, not the shoe's outer length — it is the
 * number a shopper gets by standing on a ruler, which is the whole point of the
 * column.
 *
 * Five of the eight cm values are taken verbatim from the supplier chart:
 * 36→22.5, 38→24, 39→25, 40→25.5, 41→26.5. That chart lists half sizes this shop
 * does not stock (35.5, 36.5, 37.5, 38.5, 40.5), so 35, 37 and 42 are
 * interpolated from the rows either side of them and are the ones to correct
 * first if the supplier disagrees.
 */
export type SizeConversion = {
  eu: string;
  uk: string;
  us: string;
  /** Foot length in centimetres. */
  cm: string;
};

export const SIZE_CONVERSIONS: readonly SizeConversion[] = [
  { eu: "35", uk: "2", us: "4", cm: "21.5" },
  { eu: "36", uk: "3", us: "5", cm: "22.5" },
  { eu: "37", uk: "4", us: "6", cm: "23.5" },
  { eu: "38", uk: "5", us: "7", cm: "24" },
  { eu: "39", uk: "6", us: "8", cm: "25" },
  { eu: "40", uk: "7", us: "9", cm: "25.5" },
  { eu: "41", uk: "8", us: "10", cm: "26.5" },
  { eu: "42", uk: "9", us: "11", cm: "27" },
];

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
export function buildSizeOptions(
  productSizes?: readonly (string | number)[] | null
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
    available: stocked.has(size),
  }));
}
