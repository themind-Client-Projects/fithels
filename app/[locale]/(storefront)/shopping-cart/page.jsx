import Footer1 from "@/components/footers/Footer1";
import Header1 from "@/components/headers/Header1";
import Topbar from "@/components/headers/Topbar";
import RecentProducts from "@/components/otherPages/RecentProducts";
import ShopCart from "@/components/otherPages/ShopCart";
import Link from "next/link";
import React from "react";

import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "shop" });
  return {
    title: `${t("shoppingCart")} | Fit Women Heels`,
    description: t("shoppingCart"),
  };
}

export default async function ShopingCartPage() {
  const tShop = await getTranslations("shop");
  const tNav = await getTranslations("nav");
  return (
    <>
      <Topbar />
      <Header1 />
      <div
        className="page-title"
        style={{ backgroundImage: "url(/images/section/page-title.jpg)" }}
      >
        <div className="container">
          <h3 className="heading text-center">{tShop("shoppingCart")}</h3>
          <ul className="breadcrumbs d-flex align-items-center justify-content-center">
            <li>
              <Link className="link" href={`/`}>
                {tNav("home")}
              </Link>
            </li>
            <li>
              <i className="icon-arrRight" />
            </li>
            <li>
              <Link className="link" href={`/shop-default-grid`}>
                {tNav("shop")}
              </Link>
            </li>
            <li>
              <i className="icon-arrRight" />
            </li>
            <li>{tShop("shoppingCart")}</li>
          </ul>
        </div>
      </div>

      <ShopCart />
      <RecentProducts />
      <Footer1 />
    </>
  );
}
