"use client";

import React from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionPanel,
} from "@/components/ui/accordion";
import { SIZE_CONVERSIONS } from "@/lib/products/sizes";

/**
 * The product page's information sections: description, size guide, delivery.
 *
 * Behaviour comes from the @base-ui/react accordion (keyboard support, correct
 * heading/region semantics, and the --accordion-panel-height variable that lets
 * the panel actually animate open). The look comes from plain `.pdp-acc__*`
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

  // Which rows of the conversion table this shoe is actually made in, so the
  // guide reflects the product instead of being a generic chart bolted on.
  const stocked = new Set(
    (product.sizes ?? []).map((size) => String(size).trim())
  );

  return (
    <Accordion
      className="pdp-acc"
      // base-ui's prop is `multiple`, and it defaults to false — one open
      // section would close another. Passing the wrong name did not just fail
      // silently: unknown props fall through the Root to the underlying div, so
      // React warned about an unrecognised DOM attribute.
      multiple
      defaultValue={description ? ["description"] : []}
    >
      {description && (
        <AccordionItem className="pdp-acc__item" value="description">
          <AccordionTrigger className="pdp-acc__head">
            <span>{ar ? "الوصف" : "Description"}</span>
            <span className="pdp-acc__icon" aria-hidden="true" />
          </AccordionTrigger>
          <AccordionPanel className="pdp-acc__panel">
            <div className="pdp-acc__body">
              <p className="pdp-acc__text">{description}</p>
            </div>
          </AccordionPanel>
        </AccordionItem>
      )}

      <AccordionItem className="pdp-acc__item" value="size-guide">
        <AccordionTrigger className="pdp-acc__head">
          <span>{ar ? "دليل المقاسات" : "Size guide"}</span>
          <span className="pdp-acc__icon" aria-hidden="true" />
        </AccordionTrigger>
        <AccordionPanel className="pdp-acc__panel">
          <div className="pdp-acc__body">
            <div className="pdp-acc__tablewrap">
              <table className="pdp-acc__table">
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
                    <th scope="row">UK</th>
                    {SIZE_CONVERSIONS.map((row) => (
                      <td key={row.eu}>{row.uk}</td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">US</th>
                    {SIZE_CONVERSIONS.map((row) => (
                      <td key={row.eu}>{row.us}</td>
                    ))}
                  </tr>
                  {/* Foot length — the one row a shopper can check against a
                      ruler rather than against another country's numbering. */}
                  <tr>
                    <th scope="row">{ar ? "سم" : "CM"}</th>
                    {SIZE_CONVERSIONS.map((row) => (
                      <td key={row.eu}>{row.cm}</td>
                    ))}
                  </tr>
                  <tr>
                    <th scope="row">{ar ? "متوفر" : "In stock"}</th>
                    {SIZE_CONVERSIONS.map((row) => {
                      const has = stocked.has(row.eu);
                      return (
                        <td
                          key={row.eu}
                          className={has ? "pdp-acc__yes" : "pdp-acc__no"}
                        >
                          {/* The meaning is carried in text as well as the
                              glyph — colour and a tick alone would not reach a
                              screen reader. */}
                          <span className="visually-hidden">
                            {has
                              ? ar
                                ? "متوفر"
                                : "Available"
                              : ar
                              ? "غير متوفر"
                              : "Not available"}
                          </span>
                          <span aria-hidden="true">{has ? "✓" : "—"}</span>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
            {sizeNote && <p className="pdp-acc__text">{sizeNote}</p>}
          </div>
        </AccordionPanel>
      </AccordionItem>

      {delivery && (
        <AccordionItem className="pdp-acc__item" value="delivery">
          <AccordionTrigger className="pdp-acc__head">
            <span>{ar ? "التوصيل والإرجاع" : "Delivery & returns"}</span>
            <span className="pdp-acc__icon" aria-hidden="true" />
          </AccordionTrigger>
          <AccordionPanel className="pdp-acc__panel">
            <div className="pdp-acc__body">
              <p className="pdp-acc__text">{delivery}</p>
            </div>
          </AccordionPanel>
        </AccordionItem>
      )}
    </Accordion>
  );
}
