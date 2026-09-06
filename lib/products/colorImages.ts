/**
 * Photos that belong to a colour.
 *
 * Colours used to borrow the product's gallery BY POSITION — `colors[i]` paired
 * with `images[i]` in resolveProductColors — so a product with three colours and
 * five photos paired them by accident, and reordering the gallery silently
 * pointed every swatch at a different shoe. Nothing said the two arrays were
 * meant to line up, and nothing kept them lined up.
 *
 * Photos are attached to a colour explicitly now. The product's own gallery
 * stays as the FALLBACK rather than being replaced: it is what a card shows,
 * what the page shows before a colour is chosen, and what a colour with no
 * photos of its own falls back to — so a shop can adopt this one colour at a
 * time instead of having to photograph everything before anything works.
 *
 * Pure functions over plain rows, so the dashboard form, the storefront and the
 * api all apply one set of rules.
 */

export interface ColorImageRow {
  color: string
  images: string[]
}

/**
 * The gallery to show for a colour.
 *
 * Falls back to the product's own photos when that colour has none — never to
 * an empty gallery, which would leave the page with a blank frame the moment a
 * shopper picked a colour nobody had photographed yet.
 */
export function galleryFor(
  productImages: readonly string[] | null | undefined,
  colorImages: readonly ColorImageRow[] | null | undefined,
  color: string | null | undefined
): string[] {
  const fallback = Array.isArray(productImages) ? [...productImages] : []
  if (!color || !Array.isArray(colorImages)) return fallback

  const own = colorImages.find((row) => row.color === color)?.images
  return Array.isArray(own) && own.length > 0 ? [...own] : fallback
}

/**
 * The single photo that represents a colour — on a swatch, or a card.
 *
 * Returns an empty string rather than null so callers can pass it straight to
 * an `src` guard without another branch.
 */
export function coverFor(
  productImages: readonly string[] | null | undefined,
  colorImages: readonly ColorImageRow[] | null | undefined,
  color: string | null | undefined
): string {
  return galleryFor(productImages, colorImages, color)[0] ?? ''
}

/**
 * Clean an incoming payload into rows safe to store.
 *
 * Drops anything for a colour the product is not sold in — a row left behind by
 * unticking a colour would otherwise keep photos attached to something no
 * longer offered, and reappear the moment that colour was ticked again with
 * images the shop had meant to remove. Empty rows are dropped too: "this colour
 * has no photos of its own" is the absence of a row, so there is one way to say
 * it rather than two.
 */
export function normaliseColorImages(
  input: unknown,
  colors: readonly string[]
): ColorImageRow[] {
  const offered = new Set(colors)
  const merged = new Map<string, string[]>()

  for (const raw of Array.isArray(input) ? input : []) {
    if (!raw || typeof raw !== 'object') continue
    const color = String((raw as ColorImageRow).color ?? '').trim()
    if (!offered.has(color)) continue

    const images = (Array.isArray((raw as ColorImageRow).images)
      ? (raw as ColorImageRow).images
      : []
    )
      .map((url) => String(url ?? '').trim())
      .filter(Boolean)

    if (images.length === 0) continue
    // Last write wins on a duplicated colour rather than the two being
    // concatenated, which would double a gallery from a malformed payload.
    merged.set(color, images)
  }

  return [...merged.entries()].map(([color, images]) => ({ color, images }))
}

/**
 * The product's own gallery, derived from the colour galleries.
 *
 * There is ONE uploader in the dashboard now — per colour — because two of them
 * asked the same question twice and left an admin guessing which photo a card
 * would use. This keeps `Product.images` populated all the same, since eleven
 * places read it: the cards, search, the admin order builder, the analytics
 * thumbnails, and the receipt fallback.
 *
 * Derived rather than stored separately, so it cannot drift from the photos
 * that were actually uploaded. Colour order decides gallery order, which makes
 * `images[0]` the first colour's first photo — a sensible cover — and
 * `images[1]` the next, which is what a card shows on hover.
 *
 * Deduplicated: the same file uploaded to two colours should not appear twice.
 */
export function deriveGallery(
  colorImages: readonly ColorImageRow[] | null | undefined,
  colors: readonly string[] | null | undefined
): string[] {
  const rows = Array.isArray(colorImages) ? colorImages : []
  const order = Array.isArray(colors) && colors.length > 0
    ? colors
    : rows.map((row) => row.color)

  const seen = new Set<string>()
  const gallery: string[] = []

  for (const color of order) {
    for (const url of rows.find((row) => row.color === color)?.images ?? []) {
      if (seen.has(url)) continue
      seen.add(url)
      gallery.push(url)
    }
  }
  return gallery
}

/**
 * The two photos a card shows: at rest, and on hover.
 *
 * Both come from the SAME colour. The gallery is ordered by colour now, so
 * `images[0]` and `images[1]` can be two different shoes — a card would sit
 * showing brown and flip to black on hover, which reads as the wrong picture
 * rather than as a second view. The hover falls back to the next photo in the
 * gallery only when that colour has just one.
 */
export function cardImages(
  productImages: readonly string[] | null | undefined,
  colorImages: readonly ColorImageRow[] | null | undefined,
  colors: readonly string[] | null | undefined
): { cover: string; hover: string } {
  const all = Array.isArray(productImages) ? productImages : []
  const first = Array.isArray(colors) ? colors[0] : undefined
  const own = first ? galleryFor(all, colorImages, first) : all

  const cover = own[0] ?? all[0] ?? ''
  return { cover, hover: own[1] ?? all[1] ?? cover }
}
