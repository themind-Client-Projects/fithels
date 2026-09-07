import Footer1 from "@/components/footers/Footer1";
import Header1 from "@/components/headers/Header1";
import Topbar from "@/components/headers/Topbar";
import BannerCollection from "@/components/homes/home-1/BannerCollection";
import Hero from "@/components/homes/home-1/Hero";
import Catalog from "@/components/homes/home-1/Catalog";
import Products from "@/components/common/Products3";
import Showcase from "@/components/homes/home-1/Showcase";
import HomeInfo from "@/components/homes/home-1/HomeInfo";
import { prisma } from "@/lib/prisma";
import { resolveProductColors } from "@/lib/products/colors";
import { cardPricing } from "@/lib/products/price";
import { cardImages } from "@/lib/products/colorImages";
import { stockedColors, stockedSizes, totalStock } from "@/lib/products/variants";
import { PRODUCT_CARD_SELECT } from "@/lib/products/select";
import { getTranslations } from "next-intl/server";
import { getTrustBadges } from "@/lib/settings/trustBadges";

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
    orderBy: { createdAt: "desc" },
    take: 12, // Limit for home page
    // Only the columns a card renders. Without this the descriptions (Text)
    // travelled with all 12 rows on every request.
    select: PRODUCT_CARD_SELECT,
  });

  // Map to frontend format
  const mappedProducts = dbProducts.map((p) => {
    // Both currencies at once. The dollar and dinar prices are independent, so
    // "is it on sale" and "how much off" have a different answer in each and
    // cannot be worked out from one pair of numbers.
    const pricing = cardPricing(p);
    const isSale = pricing.isOnSale;

    return {
      id: p.slug,
      // Real database id — checkout sends this as `productId`. Without it, items
      // added from the home page reach /api/orders with a slug and get rejected.
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
      filterBrands: [],
      hotSale: isSale,
      // Create some logic for "New Arrivals", "Best Seller", "On Sale"
      // Right now they're all "New Arrivals" because we ordered by desc
      // But we can add them to specific tabs based on data:
      tabFilterOptions2: [
        "New Arrivals",
        isSale ? "On Sale" : "",
        "Best Seller",
      ].filter(Boolean),
    };
  });

  const banners = await prisma.banner.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    select: {
      id: true,
      titleAr: true,
      titleEn: true,
      btnTextAr: true,
      btnTextEn: true,
      image: true,
      link: true,
      placement: true,
      subtitleAr: true,
      subtitleEn: true,
    },
  });

  // Shop-wide reassurance copy, edited in the dashboard. Read here so the client
  // components below stay presentational.
  const trustBadges = await getTrustBadges();

  // Split by placement. Every banner used to feed the hero AND the collection
  // strip at once, so the same three images appeared twice on one page, and the
  // catalogue panels between them were hardcoded and could not be edited at all.
  const heroBanners = banners.filter((b) => b.placement === "HERO");
  const catalogBanners = banners.filter((b) => b.placement === "CATALOG");
  const collectionBanners = banners.filter((b) => b.placement === "COLLECTION");
  // One panel, so the lowest `order` wins if more than one is marked SHOWCASE.
  const showcaseBanner =
    banners.find((b) => b.placement === "SHOWCASE") ?? null;

  return (
    <>
      <Topbar />
      <Header1 />
      <Hero banners={heroBanners} />
      {/* Four catalogue panels in two rows. The first two CATALOG banners fill
          the first row and the next two the second; each row keeps its original
          artwork as a fallback, so the page looks unchanged until banners are
          assigned to it in the admin. */}
      <Catalog banners={catalogBanners.slice(0, 2)} locale={locale} />
      <Catalog
        banners={catalogBanners.slice(2, 4)}
        locale={locale}
        leftImage="/images/banner/catalog2-left.png"
        rightImage="/images/banner/catalog2-right.png"
        leftAlt="Evening Collection"
        rightAlt="Luxury Heels Selection"
        leftLabel="EVENING ELEGANCE"
        rightLabel="LUXURY PICKS"
        leftCta="Discover →"
        rightCta="View All →"
      />
      <Showcase banner={showcaseBanner} />
      <Products products={mappedProducts} />
      <BannerCollection banners={collectionBanners} locale={locale} />
      <HomeInfo badges={trustBadges} locale={locale} />
      <Footer1 />
    </>
  );
}
