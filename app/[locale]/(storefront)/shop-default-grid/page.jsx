import Footer1 from "@/components/footers/Footer1";
import Header1 from "@/components/headers/Header1";
import Topbar from "@/components/headers/Topbar";
import Products1 from "@/components/products/Products1";
import Link from "next/link";
import React from "react";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { resolveProductColors } from "@/lib/products/colors";
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
  const tShop = await getTranslations({ locale, namespace: "shop" });
  const tNav = await getTranslations({ locale, namespace: "nav" });

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
      imgSrc: p.images[0] || "/images/products/womens/women-1.jpg",
      imgHover: p.images[1] || p.images[0] || "/images/products/womens/women-2.jpg",
      isOnSale: isSale,
      salePercentage: salePercent ? `${salePercent}%` : null,
      sizes: p.sizes,
      // The template expects colors as swatches: { bgColor, imgSrc }
      colors: resolveProductColors(p.colors, p.images),
      inStock: p.stock > 0,
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
      <div
        className="page-title"
        style={{ backgroundImage: "url(/images/section/page-title.jpg)" }}
      >
        <div className="container-full">
          <div className="row">
            <div className="col-12">
              <h3 className="heading text-center">{tShop("women")}</h3>
              <ul className="breadcrumbs d-flex align-items-center justify-content-center">
                <li>
                  <Link className="link" href={`/`}>
                    {tNav("home")}
                  </Link>
                </li>
                <li>
                  <i className="icon-arrRight" />
                </li>
                <li>{tShop("women")}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <Products1 products={mappedProducts} />
      <Footer1 />
    </>
  );
}
