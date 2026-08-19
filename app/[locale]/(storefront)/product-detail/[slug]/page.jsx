import Footer1 from "@/components/footers/Footer1";
import Header1 from "@/components/headers/Header1";
import Topbar from "@/components/headers/Topbar";
import DynamicDetails from "@/components/productDetails/details/DynamicDetails";
import React, { cache } from "react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RelatedProducts from "@/components/productDetails/RelatedProducts";

/**
 * Read the product straight from the database.
 *
 * Both of these used to fetch this app's own API over HTTP with a
 * `|| 'http://localhost:3000'` fallback. With NEXT_PUBLIC_SITE_URL unset in a
 * deployment, every render dialled localhost inside its own sandbox, the catch
 * swallowed ECONNREFUSED, and EVERY product page rendered "Product not found"
 * with HTTP 200 — invisible to error monitoring, while the home page and shop
 * grid (which query Prisma directly) looked perfectly healthy.
 *
 * Filtering on isActive also matters: the list endpoint was hardened for this
 * but by-slug was not, so a delisted product kept a live, indexable page with a
 * working Buy It Now that the order API only rejected at the final step.
 */
/**
 * Deduplicated across the two calls Next.js makes per render.
 *
 * `generateMetadata` and the page component both need the product, so without
 * `cache` this ran the identical query twice against a remote Postgres on every
 * product view. React's `cache` memoises for the lifetime of a single request,
 * which is exactly the scope required.
 */
const getActiveProduct = cache(async (slug) =>
  prisma.product.findFirst({
    where: { slug, isActive: true },
    include: { category: true },
  })
);

export async function generateMetadata({ params }) {
  const { slug, locale } = await params;
  
  const product = await getActiveProduct(slug);
  if (product) {
    const title = locale === "ar" ? product.titleAr : product.titleEn;
    return {
      title: `${title} | Fit`,
      description: locale === "ar" ? product.descAr : product.descEn,
    };
  }

  return {
    title: "Product Detail | Fit",
    description: "Product Detail",
  };
}

export default async function ProductDetailPage({ params }) {
  const { slug, locale } = await params;
  const t = await getTranslations({ locale, namespace: "shop" });

  const product = await getActiveProduct(slug);

  // A missing product is a real 404, not a 200 that says "not found" — the old
  // behaviour told search engines the page was fine.
  if (!product) {
    notFound();
  }

  if (!product) {
    return (
      <>
        <Topbar />
        <Header1 />
        <div className="container" style={{ padding: "100px 0", textAlign: "center" }}>
          <h2>{t("productNotFound") || "Product not found"}</h2>
        </div>
        <Footer1 hasPaddingBottom />
      </>
    );
  }

  return (
    <>
      <Topbar />
      <Header1 />
      <DynamicDetails product={product} locale={locale} />
      <RelatedProducts product={product} locale={locale} />
      <Footer1 hasPaddingBottom />
    </>
  );
}
