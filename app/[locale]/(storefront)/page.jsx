import Footer1 from "@/components/footers/Footer1";
import Header1 from "@/components/headers/Header1";
import Topbar from "@/components/headers/Topbar";
import BannerCollection from "@/components/homes/home-1/BannerCollection";
import Features from "@/components/common/Features";
import Hero from "@/components/homes/home-1/Hero";
import Catalog from "@/components/homes/home-1/Catalog";
import Products from "@/components/common/Products3";
import Showcase from "@/components/homes/home-1/Showcase";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });
  return {
    title: t("home.title"),
    description: t("home.description"),
  };
}

export default async function HomePage({ params }) {
  const { locale } = await params;
  
  // Fetch products from database
  const dbProducts = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    take: 12 // Limit for home page
  });

  // Map to frontend format
  const mappedProducts = dbProducts.map((p) => {
    const isSale = p.salePrice && p.salePrice < p.price;
    const currentPrice = p.salePrice || p.price;
    const originalPrice = isSale ? p.price : null;
    let salePercent = null;
    if (isSale) {
      salePercent = Math.round(((p.price - p.salePrice) / p.price) * 100);
    }

    return {
      id: p.slug,
      // Real database id — checkout sends this as `productId`. Without it, items
      // added from the home page reach /api/orders with a slug and get rejected.
      dbId: p.id,
      title: locale === "ar" ? p.titleAr : p.titleEn,
      price: currentPrice,
      oldPrice: originalPrice,
      imgSrc: p.images[0] || "/images/products/womens/women-1.jpg",
      imgHover: p.images[1] || p.images[0] || "/images/products/womens/women-2.jpg",
      isOnSale: isSale,
      salePercentage: salePercent ? `${salePercent}%` : null,
      sizes: p.sizes,
      colors: p.colors.map(c => ({ bgColor: "bg-main", imgSrc: p.images[0] || "" })),
      inStock: p.stock > 0,
      filterColor: p.colors,
      filterSizes: p.sizes,
      filterBrands: [],
      hotSale: isSale,
      // Create some logic for "New Arrivals", "Best Seller", "On Sale"
      // Right now they're all "New Arrivals" because we ordered by desc
      // But we can add them to specific tabs based on data:
      tabFilterOptions2: ["New Arrivals", isSale ? "On Sale" : "", "Best Seller"].filter(Boolean)
    };
  });

  const banners = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  return (
    <>
      <Topbar />
      <Header1 />
      <Hero banners={banners} />
      <Catalog />
      <Catalog
        leftImage="/images/banner/catalog2-left.png"
        rightImage="/images/banner/catalog2-right.png"
        leftAlt="Evening Collection"
        rightAlt="Luxury Heels Selection"
        leftLabel="EVENING ELEGANCE"
        rightLabel="LUXURY PICKS"
        leftCta="Discover →"
        rightCta="View All →"
      />
      <Showcase />
      <Products products={mappedProducts} />
      <BannerCollection banners={banners} locale={locale} />
      <Features />
      <Footer1 />
    </>
  );
}
