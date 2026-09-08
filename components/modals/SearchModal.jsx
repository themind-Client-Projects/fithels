"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import ProductCard1 from "../productCards/ProductCard1";
import { resolveProductColors } from "@/lib/products/colors";
import { cardPricing } from "@/lib/products/price";
import { cardImages } from "@/lib/products/colorImages";

/**
 * Search drawer.
 *
 * IT DID NOT SEARCH. The input carried `defaultValue=""` with no `onChange` and
 * no state behind it, and the form's only handler was `preventDefault()` — so
 * typing did nothing at all. Underneath, a fixed eight newest products were
 * fetched once on mount and captioned "Recently viewed products", which they
 * were not: nothing tracked views, and the list never changed. A shopper could
 * type an exact product name and watch the same eight unrelated shoes sit
 * there.
 *
 * It also carried the template's demo keyword tags — "Dresses", "Dresses midi"
 * — four dead links to `#` on a shop that sells heels.
 *
 * Now: a debounced query against the catalogue, paged, with the four states a
 * search actually has (idle, loading, empty, results) and every string
 * translated.
 */

/** Results per request, and per press of "show more". */
const PAGE_SIZE = 8;

/**
 * Wait after the last keystroke before asking the server.
 *
 * Long enough that typing a word is one request rather than six, short enough
 * that it still feels like it is keeping up.
 */
const DEBOUNCE_MS = 250;

/** Shorter than this is noise — one letter matches most of the catalogue. */
const MIN_QUERY = 2;

export default function SearchModal() {
  const locale = useLocale();
  const t = useTranslations("shop");

  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [loadingMore, setLoadingMore] = useState(false);

  /**
   * Guards against an out-of-order response.
   *
   * Two requests in flight can land in either order, and the slower one is
   * usually the EARLIER, broader query — so without this, typing "مانكو"
   * quickly could finish showing the results for "ما". Each request carries the
   * sequence number it was issued with and is discarded if it is no longer the
   * newest. A ref, not state, because it must be read and written between
   * renders.
   */
  const seq = useRef(0);

  const mapProduct = useCallback(
    (p) => ({
      id: p.slug,
      dbId: p.id,
      title: locale === "ar" ? p.titleAr : p.titleEn,
      ...cardPricing(p),
      imgSrc: cardImages(p.images, p.colorImages, p.colors).cover,
      imgHover: cardImages(p.images, p.colorImages, p.colors).hover,
      colors: resolveProductColors(p.colors, p.images, p.colorImages, p.colorHex),
      sizes: p.sizes,
      sizeSystem: p.sizeSystem,
      inStock: p.stock > 0,
    }),
    [locale]
  );

  /**
   * Fetch one page.
   *
   * `offset > 0` appends rather than replaces, which is what makes "show more"
   * add to the list instead of swapping it.
   */
  const load = useCallback(
    async (term, offset) => {
      const mine = ++seq.current;
      const append = offset > 0;

      if (append) setLoadingMore(true);
      else setStatus("loading");

      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(offset),
      });
      if (term) params.set("search", term);

      try {
        const res = await fetch(`/api/products?${params}`);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (mine !== seq.current) return; // a newer query has overtaken this one

        const mapped = Array.isArray(data) ? data.map(mapProduct) : [];
        // The count rides in a header so the body stays a plain array; see
        // app/api/products/route.ts. Falling back to what arrived means a
        // proxy that strips the header costs the "show more" button, not the
        // results.
        const count = Number(res.headers.get("X-Total-Count"));

        setItems((prev) => (append ? [...prev, ...mapped] : mapped));
        setTotal(Number.isFinite(count) && count >= 0 ? count : mapped.length);
        setStatus("ready");
      } catch {
        if (mine !== seq.current) return;
        setStatus("error");
      } finally {
        if (mine === seq.current) setLoadingMore(false);
      }
    },
    [mapProduct]
  );

  /**
   * Run the query, debounced.
   *
   * An empty box is not an empty result — it falls back to the newest products,
   * so the drawer opens with something to look at rather than a blank panel.
   */
  useEffect(() => {
    const typed = query.trim();
    // A query too short to run is treated as no query, NOT as "leave the last
    // results up": otherwise deleting back to one letter left the previous
    // matches on screen under a heading that had already reverted to the
    // suggestions, and the two disagreed about what was being shown.
    const effective = typed.length >= MIN_QUERY ? typed : "";

    const id = setTimeout(() => load(effective, 0), effective ? DEBOUNCE_MS : 0);
    return () => clearTimeout(id);
  }, [query, load]);

  const term = query.trim();
  const searching = term.length >= MIN_QUERY;
  /**
   * What the NEXT page should be fetched with — the same value the effect used.
   *
   * "Show more" took the raw box contents, so with one letter typed it would
   * have paged a SEARCH while the list on screen was the suggestions.
   */
  const effectiveTerm = searching ? term : "";
  const canLoadMore = status === "ready" && items.length < total;

  return (
    <div className="modal fade modal-search" id="search">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="d-flex justify-content-between align-items-center">
            <h5>{t("search")}</h5>
            <span
              className="icon-close icon-close-popup"
              data-bs-dismiss="modal"
            />
          </div>

          {/* Submitting is a no-op on purpose: results already follow the box as
              it is typed, so Enter has nothing left to do but reload the page. */}
          <form className="form-search" onSubmit={(e) => e.preventDefault()}>
            <fieldset className="text">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                name="text"
                tabIndex={0}
                autoComplete="off"
                aria-label={t("search")}
              />
            </fieldset>
            <button type="submit" aria-label={t("search")}>
              <svg
                className="icon"
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
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
            {/* The heading says which list this is, so the results are never
                mistaken for the suggestions the drawer opens with. */}
            <div className="d-flex justify-content-between align-items-center mb_16">
              <h6 className="mb-0">
                {searching ? t("searchResultsCount", { count: total }) : t("searchLatest")}
              </h6>
              {searching && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="btn-reset text-caption-1"
                  style={{ textDecoration: "underline", opacity: 0.7 }}
                >
                  {t("searchClear")}
                </button>
              )}
            </div>

            {/* aria-live so a screen reader is told the list changed — the
                results appear without any navigation to announce them. */}
            <div aria-live="polite" aria-busy={status === "loading"}>
              {status === "loading" && (
                <p className="text-caption-1" style={{ opacity: 0.7 }}>
                  {t("searchLoading")}
                </p>
              )}

              {status === "error" && (
                <p className="text-caption-1" style={{ color: "#a4262c" }}>
                  {t("searchFailed")}
                </p>
              )}

              {status === "ready" && items.length === 0 && (
                <div>
                  <p className="mb-1">{t("searchNoResults", { query: term })}</p>
                  <p className="text-caption-1" style={{ opacity: 0.7 }}>
                    {t("searchNoResultsHint")}
                  </p>
                </div>
              )}

              {items.length > 0 && (
                <div className="tf-grid-layout tf-col-2 lg-col-3 xl-col-4">
                  {items.map((product) => (
                    <ProductCard1 product={product} key={product.dbId} />
                  ))}
                </div>
              )}
            </div>

            {canLoadMore && (
              <div className="text-center" style={{ marginTop: "16px" }}>
                <button
                  type="button"
                  className="tf-btn btn-reset"
                  disabled={loadingMore}
                  onClick={() => load(effectiveTerm, items.length)}
                >
                  {loadingMore ? t("searchLoading") : t("searchShowMore")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
