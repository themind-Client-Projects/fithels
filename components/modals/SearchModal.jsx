"use client";
import React, { useEffect, useState } from "react";
import { useLocale } from "next-intl";

import ProductCard1 from "../productCards/ProductCard1";
import { resolveProductColors } from "@/lib/products/colors";

/**
 * Search drawer.
 *
 * The suggestions below used to come from `productMain` — the static template
 * fixture. Because this modal is mounted in the storefront layout, those eight
 * demo products sat in the DOM of EVERY page: fake titles, fake prices, and
 * links to /product-detail/7, which is not a real slug and 404s. Adding one to
 * the basket was rejected by the cart's `dbId` guard, so the only thing they
 * could do was mislead. They now come from the catalogue.
 */
const SUGGESTION_COUNT = 8;

export default function SearchModal() {
  const locale = useLocale();
  const [loadedItems, setLoadedItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/products?limit=${SUGGESTION_COUNT}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((products) => {
        if (cancelled || !Array.isArray(products)) return;
        setLoadedItems(
          products.map((p) => {
            const onSale = p.salePrice && p.salePrice < p.price;
            return {
              id: p.slug,
              dbId: p.id,
              title: locale === "ar" ? p.titleAr : p.titleEn,
              price: p.salePrice ?? p.price,
              oldPrice: onSale ? p.price : null,
              isOnSale: onSale,
              imgSrc: p.images?.[0] ?? "",
              imgHover: p.images?.[1] ?? p.images?.[0] ?? "",
              colors: resolveProductColors(p.colors, p.images, p.colorImages),
              sizes: p.sizes,
              inStock: p.stock > 0,
            };
          })
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [locale]);
  return (
    <div className="modal fade modal-search" id="search">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="d-flex justify-content-between align-items-center">
            <h5>Search</h5>
            <span
              className="icon-close icon-close-popup"
              data-bs-dismiss="modal"
            />
          </div>
          <form className="form-search" onSubmit={(e) => e.preventDefault()}>
            <fieldset className="text">
              <input
                type="text"
                placeholder="Searching..."
                className=""
                name="text"
                tabIndex={0}
                defaultValue=""
                aria-required="true"
                required
              />
            </fieldset>
            <button className="" type="submit">
              <svg
                className="icon"
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z"
                  stroke="#181818"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M21.35 21.0004L17 16.6504"
                  stroke="#181818"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
          <div>
            <h5 className="mb_16">Feature keywords Today</h5>
            <ul className="list-tags">
              <li>
                <a href="#" className="radius-60 link">
                  Dresses
                </a>
              </li>
              <li>
                <a href="#" className="radius-60 link">
                  Dresses women
                </a>
              </li>
              <li>
                <a href="#" className="radius-60 link">
                  Dresses midi
                </a>
              </li>
              <li>
                <a href="#" className="radius-60 link">
                  Dress summer
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h6 className="mb_16">Recently viewed products</h6>
            <div className="tf-grid-layout tf-col-2 lg-col-3 xl-col-4">
              {loadedItems.map((product, i) => (
                <ProductCard1 product={product} key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
