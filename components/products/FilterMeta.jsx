"use client";
import React from "react";
import { useTranslations } from "next-intl";

export default function FilterMeta({ allProps, productLength }) {
  const t = useTranslations("shop");

  return (
    <div className="meta-filter-shop" style={{}}>
      <div id="product-count-grid" className="count-text">
        {/* The number stays outside the message so it keeps its own styling,
            and the noun is pluralised through ICU — Arabic has six plural
            categories, so "منتج / منتجان / منتجات / منتجًا" cannot be picked
            with a simple count > 1 test. */}
        <span className="count">{productLength}</span>{" "}
        {t("productsFound", { count: productLength })}
      </div>

      <div id="applied-filters">
        {allProps.availability != "All" ? (
          <span
            className="filter-tag"
            onClick={() => allProps.setAvailability("All")}
          >
            {/* A translation key, not stored text — the tag and the filter
                panel then cannot word the same option differently. */}
            {t(allProps.availability.key)}
            <span className="remove-tag icon-close" />
          </span>
        ) : (
          ""
        )}
        {allProps.size != "All" ? (
          <span className="filter-tag" onClick={() => allProps.setSize("All")}>
            {allProps.size}
            <span className="remove-tag icon-close" />
          </span>
        ) : (
          ""
        )}
        {allProps.color != "All" ? (
          <span
            className="filter-tag color-tag"
            onClick={() => allProps.setColor("All")}
          >
            {/* The real colour. This was `bg-red` plus a `className` the colour
                objects have never carried, so every tag — black, white, gold —
                showed a red dot. */}
            <span
              className="color"
              style={{ backgroundColor: allProps.color.swatch?.hex }}
            />
            {allProps.color.name}
            <span className="remove-tag icon-close" />
          </span>
        ) : (
          ""
        )}

        {allProps.brands.length ? (
          <React.Fragment>
            {allProps.brands.map((brand, i) => (
              <span
                key={i}
                className="filter-tag"
                onClick={() => allProps.removeBrand(brand)}
              >
                {brand}
                <span className="remove-tag icon-close" />
              </span>
            ))}
          </React.Fragment>
        ) : (
          ""
        )}
      </div>
      {allProps.availability != "All" ||
      allProps.size != "All" ||
      allProps.color != "All" ||
      allProps.brands.length ? (
        <button
          id="remove-all"
          className="remove-all-filters text-btn-uppercase"
          onClick={allProps.clearFilter}
        >
          {t("removeAll")} <i className="icon icon-close" />
        </button>
      ) : (
        ""
      )}
    </div>
  );
}
