import React from "react";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import RelatedRail from "@/components/productDetails/RelatedRail";
import { PRODUCT_CARD_SELECT } from "@/lib/products/select";
import { resolveProductColors } from "@/lib/products/colors";

/**
 * "You may also like" under the product detail.
 *
 * A server component that runs its own query, so the product page's own data
 * fetch stays untouched and this section streams in with the rest of the page
 * rather than blocking it behind a second round trip on the client.
 *
 * Relevance widens in three steps: the same category, then other categories in
 * the same section, then anything recent. Before the catalogue had a tree this
 * could only do "same category, then anything", so a shopper looking at a flat
 * shoe was shown handbags-adjacent randomness the moment that category ran thin.
 * Now the second step keeps them among shoes.
 *
 * The row is either filled or the section is not rendered at all; a half-empty
 * row looks broken.
 *
 * Both queries select only PRODUCT_CARD_SELECT, so widening the row costs a few
 * more rows of narrow columns rather than ten full product records.
 */
export default async function RelatedProducts({ product, locale }) {
  // Ten fills the grid at every breakpoint the switcher offers without leaving a
  // short last row: 2, 3 and 4 columns all divide into 10 with at most two gaps.
  const LIMIT = 10;

  // Narrowest first, widening only as far as it has to:
  //   1. the same category  — "more flats", the answer the shopper wants
  //   2. the same section    — other shoe types, still relevant
  //   3. anything recent     — better than a half-empty row
  //
  // Each step excludes what the previous one already found, so a product never
  // appears twice, and each runs only if the row is still short.
  const seen = new Set([product.id]);
  let picks = [];

  const widen = async (where) => {
    if (picks.length >= LIMIT) return;
    const rows = await prisma.product.findMany({
      where: { isActive: true, id: { notIn: [...seen] }, ...where },
      orderBy: { createdAt: "desc" },
      take: LIMIT - picks.length,
      select: PRODUCT_CARD_SELECT,
    });
    for (const row of rows) seen.add(row.id);
    picks = [...picks, ...rows];
  };

  await widen({ categoryId: product.categoryId });

  // Siblings: every other category under the same section. Skipped when this
  // product sits directly on a section, since then step 1 already covered it.
  const sectionId = product.category?.parentId;
  if (sectionId) {
    await widen({ category: { parentId: sectionId } });
  }

  await widen({});

  // Nothing to show in a one-product catalogue; a heading over an empty grid is
  // worse than no section.
  if (picks.length === 0) return null;

  const t = await getTranslations({ locale, namespace: "shop" });

  // Same card shape the listing pages build. Kept inline, as they do — the
  // mapping is small and the alternative is a shared helper that four call
  // sites would each have to be migrated onto.
  const cards = picks.map((p) => {
    const isSale = p.salePrice && p.salePrice < p.price;
    const salePercent = isSale
      ? Math.round(((p.price - p.salePrice) / p.price) * 100)
      : null;

    return {
      id: p.slug,
      dbId: p.id,
      title: locale === "ar" ? p.titleAr : p.titleEn,
      price: p.salePrice || p.price,
      oldPrice: isSale ? p.price : null,
      imgSrc: p.images[0] || "/images/products/womens/women-1.jpg",
      imgHover: p.images[1] || p.images[0] || "/images/products/womens/women-2.jpg",
      isOnSale: isSale,
      salePercentage: salePercent ? `${salePercent}%` : null,
      sizes: p.sizes,
      colors: resolveProductColors(p.colors, p.images),
      inStock: p.stock > 0,
      filterColor: p.colors,
      filterSizes: p.sizes,
      filterBrands: [],
    };
  });

  return (
    <section className="related-products">
      <div className="container">
        <h2 className="related-products__title">{t("youMayAlsoLike")}</h2>
        {/* A horizontal rail, not a grid. Ten cards stacked two-across made a
            block taller than the product page itself, pushing the footer far
            below the fold; side by side they read as a suggestion the shopper
            can skim past. Native scroll-snap, so swipe and momentum are the
            browser's — the same approach as the product gallery.
            The rail is a client component only because of its scroll indicator;
            the cards themselves are still built here on the server. */}
        <RelatedRail cards={cards} />
      </div>
    </section>
  );
}
