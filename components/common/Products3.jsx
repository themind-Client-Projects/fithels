"use client";
import ProductCard1 from "@/components/productCards/ProductCard1";
import LayoutHandler from "@/components/products/LayoutHandler";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

// `value` is the filter key stored on each product (tabFilterOptions2), so it
// stays in English; only the visible label is translated. Translating the
// value too would silently match nothing and empty the grid.
const tabItems = [
  { value: "New Arrivals", labelKey: "newArrivals" },
  { value: "Best Seller", labelKey: "bestSeller" },
  { value: "On Sale", labelKey: "onSale" },
];

export default function Products3({ parentClass = "flat-spacing-3", products = [] }) {
  const locale = useLocale();
  const t = useTranslations("shop");
  const [activeItem, setActiveItem] = useState(tabItems[0].value); // Default the first item as active

  // Column count, same control the shop page uses. 4 matches what this grid
  // rendered before it was switchable. LayoutHandler clamps it down on narrow
  // viewports, so a phone cannot be left on a 4-across grid.
  const [activeLayout, setActiveLayout] = useState(4);

  // Derived, not state. This used to start as `[]` and fill from a 300ms
  // setTimeout inside an effect, which meant the grid was EMPTY in the server
  // HTML and for 300ms after hydration — the whole lower half of the home page
  // jumped down once it appeared, and a crawler saw no products at all.
  const selectedItems = useMemo(
    () => products.filter((elm) => elm.tabFilterOptions2?.includes(activeItem)),
    [products, activeItem]
  );

  // The template drives columns through these classes, so the switcher maps on
  // to them rather than setting grid-template-columns itself — that keeps the
  // responsive step-downs baked into the template stylesheet intact.
  const gridClass =
    activeLayout === 1
      ? "tf-col-1"
      : activeLayout === 2
        ? "tf-col-2"
        : activeLayout === 3
          ? "tf-col-2 lg-col-3"
          : "tf-col-2 lg-col-3 xl-col-4";

  // The fade is now purely cosmetic and only runs when the shopper switches
  // tab. `didMount` keeps it off the first paint, so the initial grid is
  // visible immediately rather than fading in from nothing.
  const didMount = useRef(false);
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    const el = document.getElementById("newArrivals");
    if (!el) return;
    el.classList.remove("filtered");
    const timer = setTimeout(() => el.classList.add("filtered"), 300);
    // Cleared on unmount and on a rapid second tab change — without this the
    // stale timer could re-add the class to a node that had moved on.
    return () => clearTimeout(timer);
  }, [activeItem]);
  return (
    <section className={parentClass}>
      <div className="container">
        <div className="flat-animate-tab">
          <ul className="tab-product justify-content-sm-center" role="tablist">
            {tabItems.map((item) => (
              <li key={item.value} className="nav-tab-item">
                <a
                  href={`#`} // Generate href dynamically
                  className={activeItem === item.value ? "active" : ""}
                  onClick={(e) => {
                    e.preventDefault(); // Prevent default anchor behavior
                    setActiveItem(item.value);
                  }}
                >
                  {t(item.labelKey)}
                </a>
              </li>
            ))}
          </ul>
          <div className="tab-content">
            <div
              className="tab-pane active show tabFilter filtered"
              id="newArrivals"
              role="tabpanel"
            >
              <ul className="tf-control-layout justify-content-center mb_16">
                <LayoutHandler
                  activeLayout={activeLayout}
                  setActiveLayout={setActiveLayout}
                />
              </ul>
              <div className={`tf-grid-layout ${gridClass}`}>
                {selectedItems.map((product, i) => (
                  <ProductCard1 key={i} product={product} />
                ))}
              </div>
              <div className="sec-btn text-center">
                <Link href={`/${locale}/shop-default-grid`} className="btn-line">
                  View All Products
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
