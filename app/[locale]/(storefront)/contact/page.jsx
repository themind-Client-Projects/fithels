import Footer1 from "@/components/footers/Footer1";
import Header1 from "@/components/headers/Header1";
import Topbar from "@/components/headers/Topbar";
import Contact2 from "@/components/otherPages/Contact2";
import React from "react";

import { getTranslations } from "next-intl/server";

import { prisma } from "@/lib/prisma";

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

  const dbPage = await prisma.pageContent.findUnique({
    where: { slug: "contact" },
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
      <iframe
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3023.712380803123!2d-74.00594108459235!3d40.712775279328264!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c25a3168ef8b1f%3A0xe28a875ee38c8ed1!2sNew+York%2C+NY%2C+USA!5e0!3m2!1sen!2s!4v1617203294845!5m2!1sen!2s"
        width={600}
        height={450}
        style={{ border: 0, width: "100%" }}
        allowFullScreen=""
        loading="lazy"
      />
      
      {pageContent ? (
        <section className="flat-spacing">
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
      ) : null}
      
      <Contact2 />
      <Footer1 />
    </>
  );
}
