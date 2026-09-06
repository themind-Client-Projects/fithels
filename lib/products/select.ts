import type { Prisma } from '@prisma/client'

/**
 * The exact product columns a product CARD needs — nothing more.
 *
 * The storefront listings previously ran `findMany` with no `select` at all, so
 * every render shipped `descEn` and `descAr` (unbounded Text columns holding the
 * full product description) plus `categoryId`, `createdAt`, `updatedAt` and
 * `isActive`, none of which a card reads. On the home page that is 12 rows of
 * dead weight over the wire and through the RSC payload on every request; on the
 * shop grid it is every active product in the catalogue.
 *
 * Keep this in step with the card mapper: `id` and `slug` are both required
 * because the card uses the slug for its link and the real database id for
 * checkout (`dbId`).
 */
export const PRODUCT_CARD_SELECT = {
  id: true,
  slug: true,
  titleEn: true,
  titleAr: true,
  price: true,
  salePrice: true,
  images: true,
  sizes: true,
  colors: true,
  // Inventory is per (size, colour) now, so a card cannot read one number off
  // the product. These three columns are narrow and there is at most one row
  // per pair, which is cheaper than it looks — and the card needs them anyway
  // to grey out a size the shop has run out of.
  variants: { select: { size: true, color: true, stock: true } },
  // The swatch covers. Without these the card falls back to pairing colours
  // with gallery photos BY POSITION, which was only ever a coincidence.
  colorImages: { select: { color: true, images: true } },
} satisfies Prisma.ProductSelect

export type ProductCardRow = Prisma.ProductGetPayload<{
  select: typeof PRODUCT_CARD_SELECT
}>

/**
 * Ceiling for the shop grid.
 *
 * It had no `take` at all: every active product was fetched, mapped and
 * serialised into the RSC payload on every visit. That is survivable at 8
 * products and is a cliff at 800 — and the page renders them all at once, so the
 * browser pays for it too.
 */
export const SHOP_GRID_LIMIT = 60
