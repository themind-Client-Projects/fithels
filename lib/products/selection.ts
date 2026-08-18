/**
 * The shopper's in-progress size/colour picks on a product page, kept across a
 * reload.
 *
 * Stored in sessionStorage rather than localStorage on purpose: this is an
 * unfinished choice, not a cart. It should survive a refresh or a bounce out to
 * the size guide, and it should be gone next week — a month-old selection
 * reappearing on a product whose stock has moved on is worse than an empty one.
 */

export type StoredSelection = {
  size: string;
  color: string | null;
  quantity: number;
};

export const selectionStorageKey = (slug: string) => `fit:pdp-selection:${slug}`;

type ParseOptions = {
  /** Sizes the product currently carries. */
  sizes?: readonly (string | number)[] | null;
  /** Colours the product currently carries. */
  colors?: readonly string[] | null;
  /** Units available — one counter for the whole product. */
  stock: number;
};

/**
 * Rebuild a selection from what was stored, discarding anything that no longer
 * holds.
 *
 * Everything here is a re-validation, because the catalogue can change between
 * the save and the restore: a size can be discontinued, a colour renamed, stock
 * can fall. Restoring blindly would put the page into a state the shopper could
 * not have reached — a size that is struck through as unavailable, or more units
 * selected than exist — and the mismatch would only surface as a rejected order
 * at checkout.
 *
 * Quantities are trimmed against a running budget rather than dropped, so a
 * selection of 3 on a product now down to 2 restores as 2 instead of vanishing.
 */
export function parseStoredSelections(
  raw: string | null,
  { sizes, colors, stock }: ParseOptions
): StoredSelection[] {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Corrupt or hand-edited storage is not worth reporting — start clean.
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const stocked = new Set(
    (sizes ?? []).map((size) => String(size).trim()).filter(Boolean)
  );
  const available = new Set(
    (colors ?? []).map((color) => String(color).trim()).filter(Boolean)
  );

  const restored: StoredSelection[] = [];
  const seen = new Set<string>();
  let budget = Math.max(0, Math.floor(Number(stock)) || 0);

  for (const row of parsed) {
    if (budget <= 0) break;
    if (!row || typeof row !== "object") continue;

    const candidate = row as Record<string, unknown>;
    const size = String(candidate.size ?? "").trim();
    if (!stocked.has(size)) continue;

    const rawColor = candidate.color;
    const color =
      rawColor === null || rawColor === undefined
        ? null
        : String(rawColor).trim();
    // A colour that is no longer offered invalidates the row; a product with no
    // colours at all legitimately stores null.
    if (color !== null && !available.has(color)) continue;

    // Two rows for the same variant would each become a separate line later.
    const key = `${size}::${color ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const wanted = Math.max(1, Math.floor(Number(candidate.quantity)) || 1);
    const quantity = Math.min(wanted, budget);
    if (quantity < 1) continue;

    budget -= quantity;
    restored.push({ size, color, quantity });
  }

  return restored;
}
