import Footer1 from "@/components/footers/Footer1";
import Header1 from "@/components/headers/Header1";
import Topbar from "@/components/headers/Topbar";
import BannerCollection from "@/components/homes/home-1/BannerCollection";
import Features from "@/components/common/Features";
import Hero from "@/components/homes/home-1/Hero";
import Catalog from "@/components/homes/home-1/Catalog";
import Products from "@/components/common/Products3";
import Showcase from "@/components/homes/home-1/Showcase";

export const metadata = {
  title: "Home || Fit Women Heels - Multipurpose React Nextjs eCommerce Template",
  description: "Fit Women Heels - Multipurpose React Nextjs eCommerce Template",
};

export default function HomePage() {
  return (
    <>
      <Topbar />
      <Header1 />
      <Hero />

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
      <Products />
      <BannerCollection />
      <Features />
      <Footer1 />
    </>
  );
}
