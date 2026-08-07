import Footer1 from "@/components/footers/Footer1";
import Header1 from "@/components/headers/Header1";
import Topbar from "@/components/headers/Topbar";
import Checkout from "@/components/otherPages/Checkout";
import Link from "next/link";
import React from "react";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return {
    title: `${t("title")} | Fit Women Heels`,
    description: t("title"),
  };
}

export default async function CheckoutPage() {
  const tCheckout = await getTranslations("checkout");
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
          <h3 className="heading text-center">{tCheckout("title")}</h3>
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
            <li>{tCheckout("title")}</li>
          </ul>
        </div>
      </div>
      <Checkout />
      <Footer1 />
    </>
  );
}
