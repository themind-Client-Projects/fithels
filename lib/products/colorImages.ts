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
 * Three steps down, and the middle one matters most during the changeover:
 *
 *   1. the colour's own photos;
 *   2. failing that, the product photos NO colour has claimed;
 *   3. failing that, the whole gallery.
 *
 * Step 2 exists because the product gallery now contains the colour photos too.
 * Falling straight through to it meant a colour nobody had photographed showed
 * the photos of the colour someone HAD: photograph the black pair and brown
 * starts showing black shoes, which is worse than the generic photo it used to
 * show. The unclaimed photos are exactly the shop's original generic ones.
 *
 * Never returns empty while the product has any photo at all — a blank frame the
 * moment a shopper picks a colour reads as broken.
 */
export function galleryFor(
  productImages: readonly string[] | null | undefined,
  colorImages: readonly ColorImageRow[] | null | undefined,
  color: string | null | undefined
): string[] {
  const all = Array.isArray(productImages) ? [...productImages] : []
  if (!color || !Array.isArray(colorImages)) return all

  const own = colorImages.find((row) => row.color === color)?.images
  if (Array.isArray(own) && own.length > 0) return [...own]

  const claimed = new Set(colorImages.flatMap((row) => row.images ?? []))
  const unclaimed = all.filter((url) => !claimed.has(url))
  return unclaimed.length > 0 ? unclaimed : all
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
  colors: readonly string[] | null | undefined,
  /**
   * Photos already on the product, kept after the colour ones.
   *
   * NOTHING IS EVER DESTROYED BY PHOTOGRAPHING A COLOUR. Without this, adding
   * photos to one colour of an existing product replaced its whole gallery with
   * that colour's photos — the originals were gone, unrecoverable now that the
   * general uploader is removed, and the colours NOT yet photographed fell back
   * to the gallery and so showed the one colour that had been. A shop would
   * photograph black and find brown showing black shoes.
   *
   * Keeping them means an un-photographed colour still falls back to something
   * generic, and the shop's existing work survives the transition.
   */
  keep: readonly string[] | null | undefined = []
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

  for (const url of keep ?? []) {
    if (seen.has(url)) continue
    seen.add(url)
    gallery.push(url)
  }

  return gallery
}

/**
 * The two photos a card shows: at rest, and on hover.
 *
 * Both come from the SAME colour, and there is no fallback across colours. The
 * gallery is ordered by colour, so `images[1]` is very often a different shoe —
 * a card would sit showing brown and flip to black on hover, which reads as the
 * wrong picture rather than as a second view.
 *
 * A colour with only one photo therefore has no hover, and the card simply does
 * not change. That is the honest answer: there is no second view of it. The
 * fallback for a product nobody has photographed per colour still works, since
 * galleryFor hands back the whole unclaimed gallery in that case.
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
  return { cover, hover: own[1] ?? cover }
}
