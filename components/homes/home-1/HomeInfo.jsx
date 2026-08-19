"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionPanel,
} from "@/components/ui/accordion";
import ProductTrustBadges from "@/components/productDetails/ProductTrustBadges";

/**
 * The band above the footer: how payment and delivery work, then a short FAQ.
 *
 * The three claims come from ProductTrustBadges in its stacked layout rather
 * than being written again here. Same component, same wording — the shop cannot
 * end up promising 48 hours on the product page and something else on the home
 * page, which is exactly the drift that put a "free shipping" bar on this site
 * that the checkout never honoured.
 *
 * The accordion is the same primitive and the same `.acc__*` styles the product
 * page uses; the class was named after that page until this second caller made
 * the name misleading.
 *
 * Copy lives in the shop namespace, so it is translated and editable in both
 * locales. It is not admin-editable — the pages section was removed from the
 * dashboard — so the FAQ text is a developer edit for now.
 */
export default function HomeInfo() {
  const t = useTranslations("shop");

  const faqs = [
    { value: "about", title: t("faqAboutTitle"), text: t("faqAboutText") },
    { value: "care", title: t("faqCareTitle"), text: t("faqCareText") },
    { value: "order", title: t("faqOrderTitle"), text: t("faqOrderText") },
  ];

  return (
    <section className="home-info">
      <div className="container">
        <ProductTrustBadges variant="stacked" />

        <div className="home-info__faq">
          <h2 className="home-info__title">{t("faqTitle")}</h2>
          {/* Nothing open by default: the section sits directly above the
              footer, and an expanded panel there pushes the page down for a
              shopper who never asked to read it. */}
          <Accordion className="acc" multiple defaultValue={[]}>
            {faqs.map((faq) => (
              <AccordionItem className="acc__item" value={faq.value} key={faq.value}>
                <AccordionTrigger className="acc__head">
                  <span>{faq.title}</span>
                  <span className="acc__icon" aria-hidden="true" />
                </AccordionTrigger>
                <AccordionPanel className="acc__panel">
                  <div className="acc__body">
                    <p className="acc__text">{faq.text}</p>
                  </div>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
