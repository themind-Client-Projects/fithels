"use client";

import React from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionPanel,
} from "@/components/ui/accordion";
import { SIZE_CONVERSIONS, formatCm } from "@/lib/products/sizes";

/**
 * The product page's information sections: description, size guide, delivery.
 *
 * Behaviour comes from the @base-ui/react accordion (keyboard support, correct
 * heading/region semantics, and the --accordion-panel-height variable that lets
 * the panel actually animate open). The look comes from plain `.acc__*`
 * classes in globals.css rather than Tailwind utilities, because the storefront
 * loads the template stylesheet AFTER globals and its unlayered bare-element
 * rules outrank any Tailwind utility — a trigger is a <button>, and the template
 * paints bare buttons as filled pills.
 *
 * A section with nothing to say is not rendered. An empty "Delivery" drawer that
 * opens onto boilerplate nobody wrote is worse than no drawer — the same reason
 * the cart's fake free-shipping bar was removed.
 */
export default function ProductInfoAccordion({ product, locale = "ar" }) {
  const ar = locale === "ar";

  const description = ar ? product.descAr : product.descEn;
  const sizeNote = ar ? product.sizeGuideAr : product.sizeGuideEn;
  const delivery = ar ? product.deliveryAr : product.deliveryEn;

  return (
    <Accordion
      className="acc"
      // base-ui's prop is `multiple`, and it defaults to false — one open
      // section would close another. Passing the wrong name did not just fail
      // silently: unknown props fall through the Root to the underlying div, so
      // React warned about an unrecognised DOM attribute.
      multiple
      defaultValue={description ? ["description"] : []}
    >
      {description && (
        <AccordionItem className="acc__item" value="description">
          <AccordionTrigger className="acc__head">
            <span>{ar ? "الوصف" : "Description"}</span>
            <span className="acc__icon" aria-hidden="true" />
          </AccordionTrigger>
          <AccordionPanel className="acc__panel">
            <div className="acc__body">
              <p className="acc__text">{description}</p>
            </div>
          </AccordionPanel>
        </AccordionItem>
      )}

      <AccordionItem className="acc__item" value="size-guide">
        <AccordionTrigger className="acc__head">
          <span>{ar ? "دليل المقاسات" : "Size guide"}</span>
          <span className="acc__icon" aria-hidden="true" />
        </AccordionTrigger>
        <AccordionPanel className="acc__panel">
          <div className="acc__body">
            <div className="acc__tablewrap">
              <table className="acc__table">
                <thead>
                  <tr>
                    <th scope="col">{ar ? "أوروبي" : "EU"}</th>
                    {SIZE_CONVERSIONS.map((row) => (
                      <th key={row.eu} scope="col">
                        {row.eu}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">{ar ? "أمريكي" : "US Women"}</th>
                    {SIZE_CONVERSIONS.map((row) => (
                      <td key={row.eu}>{row.us}</td>
                    ))}
                  </tr>
                  {/* Foot length — the one row a shopper can check against a
                      ruler rather than against another country's numbering.

                      There is no availability row here. The size pills above
                      already strike through what this product does not carry,
                      and repeating it in the guide meant two places to keep in
                      step for no extra information. */}
                  <tr>
                    <th scope="row">{ar ? "طول القدم (سم)" : "Foot length (cm)"}</th>
                    {SIZE_CONVERSIONS.map((row) => (
                      <td key={row.eu}>{formatCm(row.cm)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            {sizeNote && <p className="acc__text">{sizeNote}</p>}
          </div>
        </AccordionPanel>
      </AccordionItem>

      {delivery && (
        <AccordionItem className="acc__item" value="delivery">
          <AccordionTrigger className="acc__head">
            <span>{ar ? "التوصيل والإرجاع" : "Delivery & returns"}</span>
            <span className="acc__icon" aria-hidden="true" />
          </AccordionTrigger>
          <AccordionPanel className="acc__panel">
            <div className="acc__body">
              <p className="acc__text">{delivery}</p>
            </div>
          </AccordionPanel>
        </AccordionItem>
      )}
    </Accordion>
  );
}
