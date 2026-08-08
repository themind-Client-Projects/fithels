/**
 * Slug generation for products.
 *
 * The previous inline version was `titleEn.toLowerCase().replace(/[^a-z0-9]+/g,'-')`,
 * which strips every non-Latin character. In an Arabic-first dashboard an admin
 * typing Arabic into the English title field is the expected case, not an edge
 * case — and it produced an EMPTY slug, then '-1', '-2' for the next ones, so
 * product URLs became /product-detail/ and /product-detail/-1.
 *
 * Arabic is transliterated so the slug stays readable and unique, with a random
 * suffix as the final backstop. A slug is never empty.
 */

/** Common Arabic letters → Latin, enough for readable, stable slugs. */
const ARABIC_TRANSLITERATION: Record<string, string> = {
  ا: 'a', أ: 'a', إ: 'i', آ: 'aa', ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'h',
  خ: 'kh', د: 'd', ذ: 'dh', ر: 'r', ز: 'z', س: 's', ش: 'sh', ص: 's', ض: 'd',
  ط: 't', ظ: 'z', ع: 'a', غ: 'gh', ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm',
  ن: 'n', ه: 'h', و: 'w', ي: 'y', ى: 'a', ة: 'h', ء: 'a', ؤ: 'w', ئ: 'y',
}

function transliterate(input: string): string {
  return input
    .split('')
    .map((char) => ARABIC_TRANSLITERATION[char] ?? char)
    .join('')
}

/**
 * Build a URL-safe slug. Returns '' only if there is genuinely nothing usable,
 * which callers must handle with a fallback.
 */
export function slugify(input: string): string {
  if (!input) return ''

  return transliterate(input)
    .normalize('NFKD')
    // Drop combining marks so "Café" becomes "cafe" rather than "caf".
    .replace(/[̀-ͯ]/g, '')
    // Strip Arabic diacritics (tashkeel).
    .replace(/[ً-ْٰ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/**
 * Slug for a product, preferring the English title and falling back through the
 * Arabic title before resorting to a generated id. Never returns an empty slug.
 */
export function buildProductSlug(
  titleEn: string,
  titleAr?: string,
  randomSuffix = () => Math.random().toString(36).slice(2, 8)
): string {
  const fromEn = slugify(titleEn)
  if (fromEn) return fromEn

  const fromAr = slugify(titleAr ?? '')
  if (fromAr) return fromAr

  return `product-${randomSuffix()}`
}
