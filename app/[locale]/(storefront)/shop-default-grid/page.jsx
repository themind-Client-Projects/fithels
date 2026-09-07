import Footer1 from "@/components/footers/Footer1";
import Header1 from "@/components/headers/Header1";
import Topbar from "@/components/headers/Topbar";
import Products1 from "@/components/products/Products1";
import React from "react";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { resolveProductColors } from "@/lib/products/colors";
import { cardPricing } from "@/lib/products/price";
import { cardImages } from "@/lib/products/colorImages";
import { stockedColors, stockedSizes, totalStock } from "@/lib/products/variants";
import { PRODUCT_CARD_SELECT, SHOP_GRID_LIMIT } from "@/lib/products/select";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });
  return {
    title: t("shop.title"),
    description: t("shop.description"),
  };
}

export default async function ShopDefaultGridPage({ params }) {
  const { locale } = await params;

  const dbProducts = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    // This had neither a column list nor a limit: it fetched every active
    // product with its full description text and rendered them all at once.
    take: SHOP_GRID_LIMIT,
    select: PRODUCT_CARD_SELECT,
  });

  // Map database products to the format expected by the frontend
  const mappedProducts = dbProducts.map((p) => {
    // Both currencies at once. The dollar and dinar prices are independent, so
    // "is it on sale" and "how much off" have a different answer in each and
    // cannot be worked out from one pair of numbers.
    const pricing = cardPricing(p);
    const isSale = pricing.isOnSale;

    return {
      id: p.slug, // Use slug for routing
      dbId: p.id,
      title: locale === "ar" ? p.titleAr : p.titleEn,
      ...pricing,
      // Cover and hover from the SAME colour — the gallery is ordered by
      // colour, so images[0] and images[1] can be two different shoes.
      imgSrc:
        cardImages(p.images, p.colorImages, p.colors).cover ||
        "/images/products/womens/women-1.jpg",
      imgHover:
        cardImages(p.images, p.colorImages, p.colors).hover ||
        "/images/products/womens/women-2.jpg",
      sizes: p.sizes,
      // Which run those sizes belong to. Without it the card assumes the
      // numeric ladder and draws 35-41 struck through on a product sold in
      // XS/S - M/L - XL. PRODUCT_CARD_SELECT has always fetched this column;
      // nothing forwarded it.
      sizeSystem: p.sizeSystem,
      // The template expects colors as swatches: { bgColor, imgSrc }
      colors: resolveProductColors(p.colors, p.images, p.colorImages, p.colorHex),
      // Any pair left, in any size or colour. A card cannot say more than
      // that without becoming a stock report; the product page is where a
      // shopper finds out whether THEIR size is there.
      inStock: totalStock(p.variants) > 0,
      variants: p.variants,
      // What the product can be BOUGHT in, not what it is sold in. Matching on
      // the sold-in lists meant "size 41" returned shoes with zero 41s — and
      // "size 41 + in stock" returned them too, which is the whole point of
      // per-pair inventory undone on the busiest page in the shop.
      filterColor: stockedColors(p.variants),
      filterSizes: stockedSizes(p.variants),
      filterBrands: [], // No brands in DB currently
      hotSale: isSale, // Map sale to hot sale badge
    };
  });

  return (
    <>
      <Topbar />
      <Header1 />
      <Products1 products={mappedProducts} />
      <Footer1 />
    </>
  );
}
