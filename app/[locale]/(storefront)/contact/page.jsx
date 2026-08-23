import Footer1 from "@/components/footers/Footer1";
import Header1 from "@/components/headers/Header1";
import Topbar from "@/components/headers/Topbar";
import ContactChannels from "@/components/otherPages/ContactChannels";
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

  // findFirst, not findUnique, so the isActive filter applies — the dashboard
  // has an "Active" toggle for pages that previously did nothing at all here,
  // leaving a deactivated page fully live on the storefront.
  const dbPage = await prisma.pageContent.findFirst({
    where: { slug: "contact", isActive: true },
  });

  const pageContent = dbPage
    ? (locale === "ar" ? dbPage.contentAr : dbPage.contentEn)
    : "";

  return (
    <>
      <Topbar />
      <Header1 />

      {/* The heading lives inside ContactChannels now. The template's
          page-title banner was a stock photograph behind the word "Contact",
          which cost a full-width image download to say what the heading below
          it already said. */}
      <ContactChannels locale={locale} />

      {pageContent ? (
        <section className="contact-copy">
          <div className="container">
            <div
              className="prose max-w-none w-full"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(pageContent) }}
            />
          </div>
        </section>
      ) : null}

      {/* Only rendered once a real map URL is configured. The embed shipped
          with the template pointed at New York, so an Iraqi shop's contact page
          showed a map of Manhattan. */}
      {siteContact.mapEmbedUrl && (
        <iframe
          className="contact-map"
          title="map"
          src={siteContact.mapEmbedUrl}
          width={600}
          height={450}
          style={{ border: 0, width: "100%" }}
          allowFullScreen
          loading="lazy"
        />
      )}

      <Footer1 />
    </>
  );
}
