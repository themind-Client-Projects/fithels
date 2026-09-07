/**
 * THE SHOP SELLS IN TWO SIZE RUNS.
 *
 * Shoes run 35-41. Socks and similar run XS-XL, and are often made as a pair of
 * sizes in one — XS/S, M/L. Both are stored the same way, as plain strings in
 * `Product.sizes`, because a size is a label and nothing here needs it to be a
 * number. What the run decides is which options the dashboard offers, the order
 * they appear in, and whether the EU/CM/US conversion table means anything.
 *
 * The conversion table belongs to NUMERIC only. There is no letter equivalent
 * in this module and none is invented: the shop supplied a shoe chart and
 * nothing else, and a plausible-looking wrong size guide is worse than none
 * when a shopper is choosing something they cannot try on.
 */
export const SIZE_SYSTEMS = ['NUMERIC', 'LETTER'] as const;
export type SizeSystem = (typeof SIZE_SYSTEMS)[number];

export function parseSizeSystem(value: unknown): SizeSystem {
  return SIZE_SYSTEMS.includes(value as SizeSystem)
    ? (value as SizeSystem)
    : 'NUMERIC';
}

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
 * The letter run, single sizes first and paired ones after.
 *
 * The pairs are their own labels rather than a range over the singles: a
 * product made as XS/S is one thing the shop stocks and counts, not two. A shop
 * ticks whichever shape it actually sells, and mixing them on one product is
 * allowed because some ranges genuinely do — XS/S, M/L, then a standalone XL.
 */
export const LETTER_SIZES: readonly string[] = [
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XS/S",
  "M/L",
  "XL/XXL",
];

/** The run a product draws its sizes from. */
export function sizesForSystem(system: SizeSystem): readonly string[] {
  return system === "LETTER" ? LETTER_SIZES : CANONICAL_SIZES;
}

/**
 * Order within a run.
 *
 * Numeric sizes sort as numbers so "9" cannot land after "10". Letter sizes
 * sort by their position in the ladder, because alphabetically L comes before S
 * and XL before XS — which reads as nonsense on a size row.
 */
/**
 * A letter size's place on the ladder.
 *
 * Taken from the FIRST component, so a pair sits where it belongs rather than
 * after every single size. LETTER_SIZES lists the singles and then the pairs,
 * which is a sensible order to OFFER them in but nonsense to display in — it
 * put XL before XS/S. Ranking by first component gives XS/S, M/L, XL, which is
 * how the label is read.
 */
function letterRank(size: string): number {
  const head = size.split("/")[0]?.trim() ?? size;
  const i = LETTER_SIZES.indexOf(head);
  return i === -1 ? Number.POSITIVE_INFINITY : i;
}

export function compareSizes(a: string, b: string, system: SizeSystem): number {
  if (system === "LETTER") {
    const ra = letterRank(a);
    const rb = letterRank(b);
    if (ra !== rb) return ra - rb;
    // Same head: the single before the pair it starts ("XS" then "XS/S").
    return a.length - b.length || a.localeCompare(b);
  }

  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  if (Number.isFinite(na)) return -1;
  if (Number.isFinite(nb)) return 1;
  return a.localeCompare(b);
}

/**
 * Whether the EU/CM/US table applies.
 *
 * Only to shoes. A letter-sized product gets whatever the shop wrote in its own
 * size guide field and nothing else.
 */
export function hasConversionTable(system: SizeSystem): boolean {
  return system === "NUMERIC";
}

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
  isAvailable?: (size: string) => boolean,
  system: SizeSystem = "NUMERIC"
): SizeOption[] {
  const stocked = new Set(
    (productSizes ?? [])
      .map((size) => String(size).trim())
      .filter((size) => size.length > 0)
  );

  /**
   * ONLY NUMERIC SHOWS THE GAPS.
   *
   * 35-41 is one continuous ladder the shop stocks across, so a missing 36 is
   * information: it says "not this one" about a size that plainly exists.
   *
   * The letter run is not a ladder. Singles and pairs are two ways of making
   * the same garment, so a product sold as XS/S is not missing XS — it is not
   * made in XS at all, and striking one through claims otherwise. Rendering the
   * whole run put six struck-through sizes beside three real ones on a product
   * with three sizes. A letter product shows what it is sold in, in ladder
   * order, and nothing else.
   */
  const run =
    system === "LETTER"
      ? [...stocked].sort((a, b) => compareSizes(a, b, system))
      : sizesForSystem(system);

  const extras = [...stocked]
    .filter((size) => !run.includes(size))
    .sort((a, b) => compareSizes(a, b, system));

  return [...run, ...extras].map((size) => ({
    size,
    // Sold in this size AND obtainable. Both, because a size the shop has run
    // out of should read the same as one it never carried: not orderable.
    available: stocked.has(size) && (isAvailable?.(size) ?? true),
  }));
}
