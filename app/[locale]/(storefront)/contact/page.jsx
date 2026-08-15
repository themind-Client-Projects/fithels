import Footer1 from "@/components/footers/Footer1";
import Header1 from "@/components/headers/Header1";
import Topbar from "@/components/headers/Topbar";
import Contact2 from "@/components/otherPages/Contact2";
import React from "react";

import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/prisma";
import { sanitizeHtml } from "@/lib/sanitize";
import { siteContact } from "@/data/siteContact";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });
  return {
    title: t("contact.title"),
    description: t("contact.description"),
  };
}

export default async function ContactPage({ params }) {
  const { locale } = await params;
  const tNav = await getTranslations({ locale, namespace: "nav" });

  // findFirst, not findUnique, so the isActive filter applies — the dashboard
  // has an "Active" toggle for pages that previously did nothing at all here,
  // leaving a deactivated page fully live on the storefront.
  const dbPage = await prisma.pageContent.findFirst({
    where: { slug: "contact", isActive: true },
  });

  const pageTitle = dbPage 
    ? (locale === "ar" ? dbPage.titleAr : dbPage.titleEn) 
    : tNav("contact");

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
                  <a className="link" href="/">
                    {tNav("home")}
                  </a>
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
      {/* Only rendered once a real map URL is configured. The embed shipped
          with the template pointed at New York, so an Iraqi shop's contact page
          showed a map of Manhattan. */}
      {siteContact.mapEmbedUrl && (
        <iframe
          title="map"
          src={siteContact.mapEmbedUrl}
          width={600}
          height={450}
          style={{ border: 0, width: "100%" }}
          allowFullScreen
          loading="lazy"
        />
      )}
      
      {pageContent ? (
        <section className="flat-spacing">
          <div className="container">
            <div className="row">
              <div className="col-12">
                <div 
                  className="prose max-w-none w-full"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(pageContent) }} 
                />
              </div>
            </div>
          </div>
        </section>
      ) : null}
      
      <Contact2 />
      <Footer1 />
    </>
  );
}
