"use client";
import React, { useState } from "react";
import { useLocale } from "next-intl";

/**
 * Page controls.
 *
 * Works controlled or uncontrolled. GridView drives it — it owns which slice of
 * products is on screen — while the older template callers still render it bare
 * and get the previous self-contained behaviour.
 *
 * Direction matters here. The list itself is laid out by the document, so in
 * Arabic the first item (previous) sits on the RIGHT — correct. But the icons
 * were hardcoded to arrLeft for previous and arrRight for next, which pointed
 * both of them away from the page they move to. The icon is chosen by locale so
 * "previous" always points back toward the start of the reading order.
 */
export default function Pagination({
  totalPages = 3,
  currentPage,
  onPageChange,
}) {
  const [internalPage, setInternalPage] = useState(1);
  const locale = useLocale();
  const ar = locale === "ar";

  const page = currentPage ?? internalPage;
  const setPage = onPageChange ?? setInternalPage;

  const goTo = (next) => {
    if (next < 1 || next > totalPages || next === page) return;
    setPage(next);
  };

  // A single page needs no controls; rendering a disabled pair either side of a
  // lone "1" is chrome that cannot do anything.
  if (totalPages <= 1) return null;

  const prevIcon = ar ? "icon-arrRight" : "icon-arrLeft";
  const nextIcon = ar ? "icon-arrLeft" : "icon-arrRight";

  return (
    <>
      <li onClick={() => goTo(page - 1)}>
        <a
          className={`pagination-item text-button ${page === 1 ? "disabled" : ""}`}
          aria-label={ar ? "السابق" : "Previous"}
        >
          <i className={prevIcon} />
        </a>
      </li>

      {Array.from({ length: totalPages }, (_, index) => {
        const value = index + 1;
        return (
          <li
            key={value}
            className={value === page ? "active" : ""}
            onClick={() => goTo(value)}
          >
            <div className="pagination-item text-button">{value}</div>
          </li>
        );
      })}

      <li onClick={() => goTo(page + 1)}>
        <a
          className={`pagination-item text-button ${
            page === totalPages ? "disabled" : ""
          }`}
          aria-label={ar ? "التالي" : "Next"}
        >
          <i className={nextIcon} />
        </a>
      </li>
    </>
  );
}
