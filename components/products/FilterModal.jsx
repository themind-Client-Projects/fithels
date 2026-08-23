"use client";

import { useMemo } from "react";
import RangeSlider from "react-range-slider-input";
import { useTranslations } from "next-intl";
import { resolveColor } from "@/lib/products/colors";
import { AVAILABILITY_OPTIONS, NO_FILTER } from "@/lib/products/filters";
import CurrencyFormatter from "@/components/common/CurrencyFormatter";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionPanel,
} from "@/components/ui/accordion";

/**
 * The shop filter panel.
 *
 * Every facet used to be laid out at once, so the colour list — one row per
 * colour the catalogue holds — pushed the reset button off the bottom of a
 * phone. The facets are collapsible sections now, on the same accordion as the
 * product page and the home FAQ, so the panel is a short list of headings that
 * opens only what the shopper asked for. The +/- indicator is `.acc__icon`,
 * unchanged from those two, so the affordance means the same thing everywhere.
 *
 * Price and Size open by default: price is two lines whatever the catalogue
 * holds, and size is the facet a shoe shop is asked for first.
 *
 * SELECTION IS ONE-AT-A-TIME. The reducer holds a single `color` and a single
 * `size`, and re-picking the current one clears it — so these are toggles, and
 * they say so with aria-pressed rather than pretending to be checkboxes.
 * Allowing several at once is a change to the reducer and the filter effect,
 * not to this file.
 */

/** A collapsible facet. */
function Section({ value, title, children }) {
  return (
    <AccordionItem value={value} className="filter-panel__section">
      <AccordionTrigger className="filter-panel__head">
        <span className="filter-panel__title">{title}</span>
        <span className="acc__icon" aria-hidden="true" />
      </AccordionTrigger>
      <AccordionPanel className="filter-panel__panel">
        <div className="filter-panel__body">{children}</div>
      </AccordionPanel>
    </AccordionItem>
  );
}

/** A togglable row: mark, optional swatch, label, count. */
function Row({ active, onClick, swatch, label, count }) {
  return (
    <button
      type="button"
      className="filter-panel__row"
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="filter-panel__mark" aria-hidden="true" />
      {swatch ? (
        <span
          className="filter-panel__swatch"
          data-light={swatch.isLight || undefined}
          style={{ backgroundColor: swatch.hex }}
          aria-hidden="true"
        />
      ) : null}
      <span className="filter-panel__rowlabel">{label}</span>
      {count == null ? null : (
        <span className="filter-panel__count">{count}</span>
      )}
    </button>
  );
}

export default function FilterModal({ allProps, products = [] }) {
  const t = useTranslations("shop");

  const { sizes, colors, maxPrice, availabilityCounts } = useMemo(() => {
    const sizeCounts = new Map();
    const colorCounts = new Map();
    // Starts at 0 and is raised by the catalogue. It used to start at 100,
    // which for a shop whose dearest shoe is a fraction of that pinned the
    // slider to a ceiling no product came near.
    let maxP = 0;
    let inStockCount = 0;
    let outOfStockCount = 0;

    const bump = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);

    products.forEach((p) => {
      // A product listing the same size twice must not count twice.
      new Set(p.filterSizes ?? []).forEach((s) => bump(sizeCounts, s));
      new Set(p.filterColor ?? []).forEach((c) => bump(colorCounts, c));
      if (p.price > maxP) maxP = p.price;
      if (p.inStock) inStockCount += 1;
      else outOfStockCount += 1;
    });

    return {
      // Sizes arrive in whatever order the catalogue happened to yield, which
      // put 40 before 35 in the panel. Numbers sort as numbers so "9" cannot
      // land after "10"; anything non-numeric sorts alphabetically after them.
      sizes: [...sizeCounts.keys()]
        .sort((a, b) => {
          const na = Number(a);
          const nb = Number(b);
          const aNum = Number.isFinite(na);
          const bNum = Number.isFinite(nb);
          if (aNum && bNum) return na - nb;
          if (aNum) return -1;
          if (bNum) return 1;
          return String(a).localeCompare(String(b));
        })
        .map((name) => ({ name, count: sizeCounts.get(name) })),
      // Resolved to a real swatch. This built `bg-color-${name}` before, which
      // for an Arabic colour name produced a class like `bg-color-أسود` that no
      // stylesheet defines — so every filter swatch rendered blank.
      colors: [...colorCounts.keys()].map((name) => ({
        name,
        count: colorCounts.get(name),
        swatch: resolveColor(name),
      })),
      maxPrice: maxP,
      availabilityCounts: { true: inStockCount, false: outOfStockCount },
    };
  }, [products]);

  /**
   * The price range, clamped to what the catalogue actually holds.
   *
   * The reducer starts at [0, 1000] — a template default in USD, which at the
   * IQD rate displayed as "1,500,000 IQD" over a shop whose dearest shoe is a
   * few thousand. The stored value is left alone (it is a "matches everything"
   * sentinel and the filter reads it as one); only what the slider spans and
   * what the two boxes print are clamped, so the shopper sees the real range
   * and dragging writes real numbers back.
   */
  const ceiling = Math.max(1, Math.ceil(maxPrice));
  const stored = allProps.price || [0, ceiling];
  const price = [
    Math.max(0, Math.min(stored[0], ceiling)),
    Math.min(stored[1], ceiling),
  ];
  const resultCount = allProps.sorted?.length ?? 0;

  // Anything narrowing the catalogue, so the reset control can be hidden when
  // there is nothing to reset rather than sitting there inert.
  const hasFilters =
    allProps.color !== NO_FILTER ||
    allProps.size !== NO_FILTER ||
    allProps.availability !== NO_FILTER ||
    allProps.activeFilterOnSale ||
    (allProps.brands?.length ?? 0) > 0 ||
    price[0] > 0 ||
    price[1] < ceiling;

  return (
    <div className="offcanvas offcanvas-start canvas-filter" id="filterShop">
      <div className="canvas-wrapper filter-panel">
        <div className="filter-panel__header">
          <h5 className="filter-panel__heading">{t("filters")}</h5>
          <button
            type="button"
            className="filter-panel__close"
            data-bs-dismiss="offcanvas"
            aria-label={t("close")}
          >
            <span className="icon icon-close" aria-hidden="true" />
          </button>
        </div>

        <div className="filter-panel__scroll">
          <Accordion
            className="filter-panel__acc"
            multiple
            defaultValue={["price", "size"]}
          >
            <Section value="price" title={t("filterPrice")}>
              <RangeSlider
                min={0}
                max={ceiling}
                value={price}
                onInput={(value) => allProps.setPrice(value)}
              />
              <div className="filter-panel__prices">
                <div className="filter-panel__price">
                  <span className="filter-panel__pricelabel">
                    {t("minPrice")}
                  </span>
                  <span className="filter-panel__priceval">
                    <CurrencyFormatter price={price[0]} />
                  </span>
                </div>
                <div className="filter-panel__price">
                  <span className="filter-panel__pricelabel">
                    {t("maxPrice")}
                  </span>
                  <span className="filter-panel__priceval">
                    <CurrencyFormatter price={price[1]} />
                  </span>
                </div>
              </div>
            </Section>

            {sizes.length > 0 && (
              <Section value="size" title={t("filterSize")}>
                {/* Sizes stay pills: they are two characters wide, and a
                    column of full-width rows for 35-41 would be seven times
                    taller than the grid for no added clarity. The dead
                    "Free Size" chip that used to sit at the end is gone — the
                    filter effect skipped it explicitly, so picking it narrowed
                    nothing. It reappears on its own if a product carries it. */}
                <div className="filter-panel__pills">
                  {sizes.map(({ name, count }) => (
                    <button
                      type="button"
                      key={name}
                      className="filter-panel__pill"
                      aria-pressed={allProps.size === name}
                      title={`${name} (${count})`}
                      onClick={() => allProps.setSize(name)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </Section>
            )}

            {colors.length > 0 && (
              <Section value="color" title={t("filterColor")}>
                <div className="filter-panel__rows">
                  {/* The whole memoized object goes back to setColor, never a
                      fresh literal: the reducer clears a facet by comparing
                      identity, so a new object would re-select the colour
                      instead of unselecting it. */}
                  {colors.map((color) => (
                    <Row
                      key={color.name}
                      active={color.name === allProps.color?.name}
                      onClick={() => allProps.setColor(color)}
                      swatch={color.swatch}
                      label={color.name}
                      count={color.count}
                    />
                  ))}
                </div>
              </Section>
            )}

            <Section value="availability" title={t("filterAvailability")}>
              <div className="filter-panel__rows">
                {AVAILABILITY_OPTIONS.map((option) => (
                  <Row
                    key={String(option.value)}
                    active={allProps.availability?.value === option.value}
                    onClick={() => allProps.setAvailability(option)}
                    label={t(option.key)}
                    count={availabilityCounts[option.value]}
                  />
                ))}
              </div>
            </Section>
          </Accordion>
        </div>

        <div className="filter-panel__footer">
          {/* Filters apply as they are picked, so this only closes the panel —
              but it is the control a shopper looks for, and it carries the
              count so the result is known before the panel is dismissed. */}
          <button
            type="button"
            className="filter-panel__apply"
            data-bs-dismiss="offcanvas"
          >
            {t("viewProducts")}
            <span className="filter-panel__applycount">({resultCount})</span>
          </button>
          {hasFilters ? (
            <button
              type="button"
              id="reset-filter"
              className="filter-panel__reset"
              onClick={allProps.clearFilter}
            >
              {t("resetFilters")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
