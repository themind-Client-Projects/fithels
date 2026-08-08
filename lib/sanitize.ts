import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitiser for CMS page content.
 *
 * `PageContent.contentEn/contentAr` are free-form HTML written in the dashboard
 * and rendered with `dangerouslySetInnerHTML` on public storefront pages. The
 * write endpoints admit EMPLOYEE, not just ADMIN, so without this any employee
 * could inject a script that ran for every visitor — including admins, whose
 * session cookie would then be in reach.
 *
 * Applied at the render sink rather than only on write, so content saved before
 * this existed is also neutralised without a data migration.
 */
const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'span', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'small', 'mark',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'a', 'img',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
]

const ALLOWED_ATTR = [
  'href', 'title', 'target', 'rel',
  'src', 'alt', 'width', 'height', 'loading',
  'class', 'dir', 'lang',
  'colspan', 'rowspan',
]

export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return ''

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Block javascript:/data: URLs in href/src.
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/|#)/i,
    // Strip the contents of anything removed, not just the tag itself, so a
    // <script> body never survives as visible text.
    KEEP_CONTENT: false,
    // No <svg>/<math> — they carry their own script vectors.
    USE_PROFILES: { html: true },
  })
}
