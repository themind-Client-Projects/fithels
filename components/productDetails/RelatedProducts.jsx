import React from "react";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import ProductCard1 from "@/components/productCards/ProductCard1";
import { PRODUCT_CARD_SELECT } from "@/lib/products/select";
import { resolveProductColors } from "@/lib/products/colors";

/**
 * "You may also like" under the product detail.
 *
 * A server component that runs its own query, so the product page's own data
 * fetch stays untouched and this section streams in with the rest of the page
 * rather than blocking it behind a second round trip on the client.
 *
 * Same-category first, because that is the useful sense of "similar" the data
 * actually supports — there is no tagging or embedding to do better with. If the
 * category is thin, the list is topped up with recent products so the section is
 * either properly filled or not rendered at all; a half-empty row looks broken.
 *
 * Both queries select only PRODUCT_CARD_SELECT, so widening the row costs a few
 * more rows of narrow columns rather than ten full product records.
 */
export default async function RelatedProducts({ product, locale }) {
  // Ten fills the grid at every breakpoint the switcher offers without leaving a
  // short last row: 2, 3 and 4 columns all divide into 10 with at most two gaps.
  const LIMIT = 10;

  const sameCategory = await prisma.product.findMany({
    where: {
      isActive: true,
      categoryId: product.categoryId,
      // Never recommend the product the shopper is already looking at.
      id: { not: product.id },
    },
    orderBy: { createdAt: "desc" },
    take: LIMIT,
    select: PRODUCT_CARD_SELECT,
  });

  let picks = sameCategory;

  if (picks.length < LIMIT) {
    const seen = new Set([product.id, ...picks.map((p) => p.id)]);
    const filler = await prisma.product.findMany({
      where: { isActive: true, id: { notIn: [...seen] } },
      orderBy: { createdAt: "desc" },
      take: LIMIT - picks.length,
      select: PRODUCT_CARD_SELECT,
    });
    picks = [...picks, ...filler];
  }

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
        <div className="tf-grid-layout tf-col-2 lg-col-3 xl-col-4">
          {cards.map((card) => (
            <ProductCard1 key={card.dbId} product={card} />
          ))}
        </div>
      </div>
    </section>
  );
}
