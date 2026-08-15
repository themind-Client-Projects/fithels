/**
 * Turn the Prisma errors that a bad REQUEST causes into 4xx responses.
 *
 * These were all falling into generic `catch` blocks that logged and returned
 * 500 "Failed to create product". Two things go wrong with that:
 *
 *   - the admin is told the server broke when in fact they picked a category
 *     that no longer exists, so they retry the same thing and fail again;
 *   - genuine server faults become indistinguishable from user mistakes in the
 *     logs, which is exactly when you need to tell them apart.
 *
 * Only the codes that a caller can actually provoke are translated. Anything
 * else keeps falling through to a 500, because it IS one.
 */

export interface PrismaRequestError {
  status: number
  error: string
  reason: string
  /** The offending field, when Prisma names it. */
  field?: string
}

interface KnownPrismaError {
  code?: string
  meta?: {
    target?: string[] | string
    field_name?: string
    modelName?: string
  }
}

function fieldFrom(meta: KnownPrismaError['meta']): string | undefined {
  if (!meta) return undefined
  if (Array.isArray(meta.target)) return meta.target[0]
  if (typeof meta.target === 'string') return meta.target
  if (typeof meta.field_name === 'string') {
    // Prisma reports these as `Product_categoryId_fkey`; the middle segment is
    // the column the caller actually got wrong.
    const match = meta.field_name.match(/^[A-Za-z]+_(.+)_fkey$/)
    return match ? match[1] : meta.field_name
  }
  return undefined
}

/**
 * @returns a 4xx description when the error was the caller's fault, or null
 *          when it should stay a 500.
 */
export function translatePrismaError(error: unknown): PrismaRequestError | null {
  if (typeof error !== 'object' || error === null) return null
  const e = error as KnownPrismaError
  const field = fieldFrom(e.meta)

  switch (e.code) {
    // Unique constraint — the value is already taken.
    case 'P2002':
      return {
        status: 409,
        error: field
          ? `That ${field} is already in use.`
          : 'That value is already in use.',
        reason: 'DUPLICATE_VALUE',
        field,
      }

    // Foreign key constraint — points at a row that does not exist.
    case 'P2003':
      return {
        status: 400,
        error: field
          ? `The ${field} you selected no longer exists. Refresh and choose again.`
          : 'One of the selected references no longer exists.',
        reason: 'RELATED_RECORD_MISSING',
        field,
      }

    // Required relation violation.
    case 'P2014':
      return {
        status: 400,
        error: 'That change would break a required relationship.',
        reason: 'REQUIRED_RELATION_VIOLATION',
        field,
      }

    // Record not found for an update/delete.
    case 'P2025':
      return {
        status: 404,
        error: 'That record no longer exists.',
        reason: 'RECORD_NOT_FOUND',
        field,
      }

    // A value is too long for its column.
    case 'P2000':
      return {
        status: 400,
        error: field ? `The ${field} is too long.` : 'One of the values is too long.',
        reason: 'VALUE_TOO_LONG',
        field,
      }

    default:
      return null
  }
}
