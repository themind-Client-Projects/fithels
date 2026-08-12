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
  return {
    key: `custom-${normaliseForSearch(name).replace(/[^a-z0-9]+/g, '-') || 'unnamed'}`,
    nameAr: name,
    nameEn: name,
    hex: '#d4d4d8',
    isLight: true,
  }
}

/**
 * Resolve a stored colour name to a swatch.
 *
 * Matches on the Arabic name, the English name or the slug, under the same
 * normalisation used for search — so "ابيض" (bare alef, what most phone
 * keyboards produce) still finds "أبيض".
 */
export function resolveColor(name: string): ColorOption {
  const needle = normaliseForSearch(String(name ?? ''))
  if (!needle) return fallback('')

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
  images: readonly string[] | null | undefined
): Array<ColorOption & { imgSrc: string }> {
  const list = Array.isArray(colors) ? colors : []
  const photos = Array.isArray(images) ? images : []

  return list.map((name, index) => ({
    ...resolveColor(name),
    imgSrc: photos[index] ?? photos[0] ?? '',
  }))
}
