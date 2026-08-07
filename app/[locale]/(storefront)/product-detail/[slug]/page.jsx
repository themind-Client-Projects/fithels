import Footer1 from "@/components/footers/Footer1";
import Header1 from "@/components/headers/Header1";
import Topbar from "@/components/headers/Topbar";
import DynamicDetails from "@/components/productDetails/details/DynamicDetails";
import React from "react";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }) {
  const { slug, locale } = await params;
  
  try {
    // We would normally fetch the product here to get the real title for metadata
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/products/by-slug/${slug}`, {
      next: { revalidate: 60 }
    });
    
    if (res.ok) {
      const product = await res.json();
      const title = locale === 'ar' ? product.titleAr : product.titleEn;
      return {
        title: `${title} | Fit`,
        description: locale === 'ar' ? product.descAr : product.descEn,
      };
    }
  } catch (error) {
    console.error("Failed to generate metadata for product", error);
  }

  return {
    title: "Product Detail | Fit",
    description: "Product Detail",
  };
}

export default async function ProductDetailPage({ params }) {
  const { slug, locale } = await params;
  const t = await getTranslations({ locale, namespace: "shop" });

  let product = null;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/products/by-slug/${slug}`, {
      cache: 'no-store'
    });
    if (res.ok) {
      product = await res.json();
    }
  } catch (error) {
    console.error("Failed to fetch product", error);
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
      <Footer1 hasPaddingBottom />
    </>
  );
}
