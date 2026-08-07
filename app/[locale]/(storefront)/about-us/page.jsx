import Brands from "@/components/common/Brands";
import Features from "@/components/common/Features";
import Footer1 from "@/components/footers/Footer1";
import Header1 from "@/components/headers/Header1";
import Link from "next/link";
import Topbar from "@/components/headers/Topbar";
import About from "@/components/otherPages/About";
import Team from "@/components/otherPages/Team";
import Testimonials from "@/components/otherPages/Testimonials";
import React from "react";
import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/prisma";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });
  return {
    title: t("about.title"),
    description: t("about.description"),
  };
}

export default async function AboutUsPage({ params }) {
  const { locale } = await params;
  const tNav = await getTranslations({ locale, namespace: "nav" });
  
  const dbPage = await prisma.pageContent.findUnique({
    where: { slug: "about" },
  });

  const pageTitle = dbPage 
    ? (locale === "ar" ? dbPage.titleAr : dbPage.titleEn) 
    : tNav("about");

  const pageContent = dbPage
    ? (locale === "ar" ? dbPage.contentAr : dbPage.contentEn)
    : "";

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
              <h3 className="heading text-center">{pageTitle}</h3>
              <ul className="breadcrumbs d-flex align-items-center justify-content-center">
                <li>
                  <Link className="link" href={`/`}>
                    {tNav("home")}
                  </Link>
                </li>
                <li>
                  <i className="icon-arrRight" />
                </li>
                <li>{pageTitle}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {pageContent ? (
        <section className="flat-spacing about-us-main pb_0">
          <div className="container">
            <div className="row">
              <div className="col-12">
                <div 
                  className="prose max-w-none w-full"
                  dangerouslySetInnerHTML={{ __html: pageContent }} 
                />
              </div>
            </div>
          </div>
        </section>
      ) : (
        <About />
      )}
      
      <Features parentClass="flat-spacing line-bottom-container mt-5" />
      <Team />
      <Brands parentClass="flat-spacing-5 bg-surface" />
      <Testimonials />
      <Footer1 />
    </>
  );
}
