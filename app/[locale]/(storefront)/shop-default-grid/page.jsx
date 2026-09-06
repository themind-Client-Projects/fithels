import Footer1 from "@/components/footers/Footer1";
import Header1 from "@/components/headers/Header1";
import Topbar from "@/components/headers/Topbar";
import Products1 from "@/components/products/Products1";
import React from "react";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { resolveProductColors } from "@/lib/products/colors";
import { cardImages } from "@/lib/products/colorImages";
import { totalStock } from "@/lib/products/variants";
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
    orderBy: { createdAt: 'desc' },
    // This had neither a column list nor a limit: it fetched every active
    // product with its full description text and rendered them all at once.
    take: SHOP_GRID_LIMIT,
    select: PRODUCT_CARD_SELECT,
  });

  // Map database products to the format expected by the frontend
  const mappedProducts = dbProducts.map((p) => {
    const isSale = p.salePrice && p.salePrice < p.price;
    const currentPrice = p.salePrice || p.price;
    const originalPrice = isSale ? p.price : null;
    let salePercent = null;
    if (isSale) {
      salePercent = Math.round(((p.price - p.salePrice) / p.price) * 100);
    }

    return {
      id: p.slug, // Use slug for routing
      dbId: p.id,
      title: locale === "ar" ? p.titleAr : p.titleEn,
      price: currentPrice,
      oldPrice: originalPrice,
      // Cover and hover from the SAME colour — the gallery is ordered by
      // colour, so images[0] and images[1] can be two different shoes.
      imgSrc: cardImages(p.images, p.colorImages, p.colors).cover || "/images/products/womens/women-1.jpg",
      imgHover: cardImages(p.images, p.colorImages, p.colors).hover || "/images/products/womens/women-2.jpg",
      isOnSale: isSale,
      salePercentage: salePercent ? `${salePercent}%` : null,
      sizes: p.sizes,
      // The template expects colors as swatches: { bgColor, imgSrc }
      colors: resolveProductColors(p.colors, p.images, p.colorImages),
      // Any pair left, in any size or colour. A card cannot say more than
      // that without becoming a stock report; the product page is where a
      // shopper finds out whether THEIR size is there.
      inStock: totalStock(p.variants) > 0,
      variants: p.variants,
      filterColor: p.colors,
      filterSizes: p.sizes,
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
