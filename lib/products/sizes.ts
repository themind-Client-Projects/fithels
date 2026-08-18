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
