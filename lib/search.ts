/**
 * Text normalisation for dashboard search.
 *
 * Two problems this solves:
 *
 * 1. The query was matched untrimmed, so a single pasted trailing space — which
 *    copying an Arabic name almost always carries — made a record unfindable.
 * 2. Arabic has several letters with interchangeable written forms. A shopper's
 *    name stored as "أحمد" would not match a search for "احمد" (bare alef),
 *    which is what most phone keyboards produce, and tashkeel made stored text
 *    unsearchable entirely.
 */
export function normaliseForSearch(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      // Tashkeel (harakat) and tatweel carry no search meaning.
      .replace(/[ً-ْٰـ]/g, '')
      // Alef variants → bare alef.
      .replace(/[آأإٱ]/g, 'ا')
      // Taa marbuta → haa (اناقة / أناقه).
      .replace(/ة/g, 'ه')
      // Alef maqsura → yaa (على / علي).
      .replace(/ى/g, 'ي')
      // Hamza carriers → their base letter.
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      // Collapse internal whitespace so "ahmed   ali" matches "ahmed ali".
      .replace(/\s+/g, ' ')
  )
}

/** True when `haystack` contains `needle` under search normalisation. */
export function matchesSearch(haystack: unknown, needle: string): boolean {
  if (haystack === null || haystack === undefined) return false

  const text =
    typeof haystack === 'string' ? haystack : String(haystack)

  return normaliseForSearch(text).includes(needle)
}
