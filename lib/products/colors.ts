import { normaliseForSearch } from '@/lib/search'

/**
 * Product colours, resolved from the free-text names stored on Product.colors.
 *
 * Colours are stored as human names ("أسود", "Beige") rather than hex, because
 * that is what the admin form has always written and what OrderItem.color
 * records against historic orders. Changing the storage would rewrite history,
 * so this module resolves names to swatches at render time instead.
 *
 * It exists because every consumer was inventing its own broken mapping:
 *
 *   - the product grids mapped EVERY colour to the class `bg-main`, so a shoe
 *     offered in black, orange and dark pink rendered three identical black
 *     dots;
 *   - the filter drawer built `bg-color-${name.toLowerCase()}`, which for an
 *     Arabic name produces `bg-color-أسود` — a class that does not exist, so
 *     those swatches rendered as invisible blanks.
 *
 * Both now go through `resolveColor`.
 */

export interface ColorOption {
  /** Stable slug, safe for keys and CSS. */
  key: string
  nameAr: string
  nameEn: string
  hex: string
  /**
   * True when the swatch is too pale to read against a white card and needs a
   * border of its own. Without it white and beige were invisible dots.
   */
  isLight: boolean
}

/**
 * The palette offered in the dashboard and understood by the storefront.
 *
 * Every colour currently present in the database is represented here; anything
 * else still renders via the fallback below rather than disappearing.
 */
export const COLOR_PALETTE: readonly ColorOption[] = [
  { key: 'black', nameAr: 'أسود', nameEn: 'Black', hex: '#111111', isLight: false },
  { key: 'white', nameAr: 'أبيض', nameEn: 'White', hex: '#ffffff', isLight: true },
  { key: 'beige', nameAr: 'بيج', nameEn: 'Beige', hex: '#e3d5c0', isLight: true },
  { key: 'grey', nameAr: 'رمادي', nameEn: 'Grey', hex: '#9ca3af', isLight: false },
  { key: 'dark-grey', nameAr: 'رمادي غامق', nameEn: 'Dark Grey', hex: '#4b5563', isLight: false },
  { key: 'red', nameAr: 'أحمر', nameEn: 'Red', hex: '#dc2626', isLight: false },
  { key: 'pink', nameAr: 'وردي', nameEn: 'Pink', hex: '#f9a8d4', isLight: true },
  { key: 'dark-pink', nameAr: 'وردي داكن', nameEn: 'Dark Pink', hex: '#be185d', isLight: false },
  { key: 'orange', nameAr: 'برتقالي', nameEn: 'Orange', hex: '#ea580c', isLight: false },
  { key: 'light-orange', nameAr: 'برتقالي فاتح', nameEn: 'Light Orange', hex: '#fdba74', isLight: true },
  { key: 'light-blue', nameAr: 'أزرق فاتح', nameEn: 'Light Blue', hex: '#93c5fd', isLight: true },
  { key: 'blue', nameAr: 'أزرق', nameEn: 'Blue', hex: '#2563eb', isLight: false },
  { key: 'navy', nameAr: 'كحلي', nameEn: 'Navy', hex: '#1e3a5f', isLight: false },
  { key: 'light-green', nameAr: 'أخضر فاتح', nameEn: 'Light Green', hex: '#86efac', isLight: true },
  { key: 'green', nameAr: 'أخضر', nameEn: 'Green', hex: '#16a34a', isLight: false },
  { key: 'brown', nameAr: 'بني', nameEn: 'Brown', hex: '#78350f', isLight: false },
  { key: 'gold', nameAr: 'ذهبي', nameEn: 'Gold', hex: '#d4af37', isLight: true },
  { key: 'silver', nameAr: 'فضي', nameEn: 'Silver', hex: '#c0c0c0', isLight: true },
  { key: 'purple', nameAr: 'بنفسجي', nameEn: 'Purple', hex: '#7c3aed', isLight: false },
  { key: 'yellow', nameAr: 'أصفر', nameEn: 'Yellow', hex: '#facc15', isLight: true },
  { key: 'nude', nameAr: 'حليبي', nameEn: 'Nude', hex: '#e8c4a0', isLight: true },
]

/**
 * Longest name first so "وردي داكن" (dark pink) is tested before "وردي" (pink);
 * matching shortest-first would collapse both onto the same swatch.
 */
const LOOKUP: ReadonlyArray<readonly [string, ColorOption]> = COLOR_PALETTE.flatMap(
  (option) =>
    [option.nameAr, option.nameEn, option.key].map(
      (alias) => [normaliseForSearch(alias), option] as const
    )
).sort((a, b) => b[0].length - a[0].length)

/**
 * A neutral swatch for a name outside the palette.
 *
 * Deliberately returns something visible and labelled rather than nothing: an
 * admin who types a colour we do not know should still see a usable chip, and a
 * shopper should never be shown a blank dot.
 */
function fallback(name: string): ColorOption {
  // \p{L}\p{N} rather than a-z0-9: the old class kept LATIN letters only, so
  // every Arabic name lost all of its characters and collapsed to the same key,
  // `custom--`. Two custom colours were then indistinguishable — the product
  // form's duplicate check silently refused the second one, and any list keyed
  // by this rendered duplicate React keys.
  const slug = normaliseForSearch(name).replace(/[^\p{L}\p{N}]+/gu, '-')
  return {
    key: `custom-${slug.replace(/^-|-$/g, '') || 'unnamed'}`,
    nameAr: name,
    nameEn: name,
    hex: '#d4d4d8',
    isLight: true,
  }
}

/**
 * A product's own swatches, as stored in `Product.colorHex`.
 *
 * Deliberately `unknown`: this arrives from a Prisma Json column (typed
 * JsonValue) and from request bodies, and every entry is validated at runtime
 * below anyway. Narrowing the TYPE would only force a cast at each of the
 * twelve call sites without making any of them safer.
 */
export type ColorHexMap = unknown

/** #rgb or #rrggbb. Anything else is ignored rather than written into a style. */
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

/**
 * Perceived brightness, so a pale custom colour gets the same border that
 * white and beige get in the built-in palette.
 *
 * Rec. 601 luma: green dominates how bright a colour looks, blue barely
 * registers. A flat average calls #ffff00 (yellow) dark and it disappears
 * against a white card.
 */
function isLightHex(hex: string): boolean {
  let h = hex.slice(1)
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (r * 299 + g * 587 + b * 114) / 1000 > 165
}

/**
 * Look the name up in the product's own swatches.
 *
 * Exact key first, then the same normalisation the palette uses, so a colour
 * saved as "قرمزي" still matches a variant row recording "قرمزي " with a
 * stray space.
 */
function fromProduct(name: string, custom: ColorHexMap): ColorOption | null {
  if (!custom || typeof custom !== 'object') return null

  const map = custom as Record<string, unknown>
  const raw = String(name ?? '')
  let hex: unknown = map[raw]

  if (!hex) {
    const needle = normaliseForSearch(raw)
    const hit = Object.entries(map).find(
      ([key]) => normaliseForSearch(key) === needle
    )
    hex = hit?.[1]
  }

  if (typeof hex !== 'string' || !HEX.test(hex.trim())) return null
  const clean = hex.trim().toLowerCase()

  return {
    key: fallback(raw).key,
    nameAr: raw,
    nameEn: raw,
    hex: clean,
    isLight: isLightHex(clean),
  }
}

/**
 * Resolve a stored colour name to a swatch.
 *
 * Checks the product's own swatches first, then matches on the Arabic name, the
 * English name or the slug, under the same normalisation used for search — so
 * "ابيض" (bare alef, what most phone keyboards produce) still finds "أبيض".
 */
export function resolveColor(name: string, custom?: ColorHexMap): ColorOption {
  const needle = normaliseForSearch(String(name ?? ''))
  if (!needle) return fallback('')

  // The product's own swatch WINS over the built-in palette. The shop chose it
  // deliberately for this name; a containment match against a stock palette is
  // a guess, and "أسود لامع" resolving to plain black is exactly the guess an
  // explicit choice should override.
  const own = fromProduct(name, custom)
  if (own) return own

  const exact = LOOKUP.find(([alias]) => alias === needle)
  if (exact) return exact[1]

  // Fall back to a containment match so "أسود لامع" (glossy black) still reads
  // as black rather than dropping to the neutral chip.
  const partial = LOOKUP.find(
    ([alias]) => needle.includes(alias) || alias.includes(needle)
  )
  return partial ? partial[1] : fallback(name)
}

/** The display name for a colour in the active locale. */
export function colorLabel(option: ColorOption, locale: string): string {
  return locale === 'en' ? option.nameEn : option.nameAr
}

/**
 * Shape the product grids consume: one entry per stored colour, carrying both
 * the swatch and the image to preview on hover.
 *
 * `imgSrc` is indexed per colour where the product has enough photos, so
 * hovering the second swatch shows the second image instead of every swatch
 * showing the same one.
 */
export function resolveProductColors(
  colors: readonly string[] | null | undefined,
  images: readonly string[] | null | undefined,
  colorImages?: readonly { color: string; images: string[] }[] | null,
  /** The product's own swatches, from Product.colorHex. */
  custom?: ColorHexMap
): Array<ColorOption & { imgSrc: string }> {
  const list = Array.isArray(colors) ? colors : []
  const photos = Array.isArray(images) ? images : []

  /**
   * Photos that belong to some OTHER colour, so they can never stand in for a
   * colour that has none of its own.
   *
   * The fallback here used to be positional — colour[i] paired with images[i] —
   * which was only ever a coincidence, and once colours had their own galleries
   * it became actively wrong: on a product where black is photographed and red
   * is not, red's swatch previewed a black shoe. Falling back to an UNCLAIMED
   * photo is the same rule galleryFor and cardImages already follow, so the
   * card's cover and its swatches finally agree about what a colour looks like.
   */
  const claimed = new Set(
    (colorImages ?? []).flatMap((row) => row.images ?? [])
  )
  const unclaimed = photos.filter((url) => !claimed.has(url))

  return list.map((name, index) => {
    // The colour's OWN cover when it has one.
    const own = colorImages?.find((row) => row.color === name)?.images?.[0]

    // Positional only among the photos NO colour claims — that is the
    // pre-per-colour catalogue, where position was the only pairing there was.
    const generic = unclaimed[index] || unclaimed[0]

    return {
      ...resolveColor(name, custom),
      imgSrc: own || generic || '',
    }
  })
}

/**
 * Clean the { name: hex } map a product stores for its own swatches.
 *
 * Drops any entry whose colour is not actually sold — the same rule the stock
 * rows and the per-colour photos follow, so unticking a colour cannot leave a
 * swatch behind that reappears the moment it is ticked again.
 *
 * Also drops anything that is not a real hex. This value is written straight
 * into a `background-color`, so it must never carry arbitrary text from a
 * request body.
 */
export function normaliseColorHex(
  input: unknown,
  colors: readonly string[]
): Record<string, string> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}

  const sold = new Set(colors)
  const out: Record<string, string> = {}

  for (const [name, hex] of Object.entries(input as Record<string, unknown>)) {
    if (!sold.has(name)) continue
    if (typeof hex !== 'string') continue
    const clean = hex.trim().toLowerCase()
    if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/.test(clean)) continue
    out[name] = clean
  }

  return out
}
