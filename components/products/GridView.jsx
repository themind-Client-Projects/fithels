"use client";

import React, { useState } from "react";
import ProductCard1 from "../productCards/ProductCard1";
import Pagination from "../common/Pagination";

/** Cards per page. */
const PAGE_SIZE = 12;

/**
 * The shop grid.
 *
 * The pagination here used to be decorative: this rendered EVERY product it was
 * given and the pager kept a highlighted number in its own state, hardcoded to
 * three pages whatever the catalogue actually held. Clicking "2" moved the
 * highlight and nothing else.
 *
 * The page now owns which slice is shown, and the pager is told what to display
 * rather than deciding for itself.
 */
export default function GridView({ products, pagination = true }) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));

  // Filters can shrink the result set under the current page — pick something
  // sensible rather than showing an empty grid on page 3 of 1. Derived, not
  // corrected in an effect, so there is no render where the grid is blank.
  const safePage = Math.min(page, totalPages);

  const visible = pagination
    ? products.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
    : products;

  return (
    <>
      {visible.map((product) => (
        <ProductCard1
          // The database id, not the array index: paging changes what sits at
          // each position, and an index key would have React reuse a card's
          // state — its hovered image — for a different product.
          key={product.dbId ?? product.id}
          product={product}
          gridClass="grid"
        />
      ))}

      {pagination && totalPages > 1 ? (
        <ul className="wg-pagination justify-content-center">
          <Pagination
            totalPages={totalPages}
            currentPage={safePage}
            onPageChange={setPage}
          />
        </ul>
      ) : null}
    </>
  );
}
