"use client";

import { useMemo } from "react";
import RangeSlider from "react-range-slider-input";
import { useTranslations } from "next-intl";
import { resolveColor } from "@/lib/products/colors";

export default function FilterModal({ allProps, products = [] }) {
  const t = useTranslations("shop");

  // Compute dynamic filters
  const { sizes, colors, maxPrice, availabilityCounts } = useMemo(() => {
    const sizeSet = new Set();
    const colorSet = new Set();
    let maxP = 100;
    let inStockCount = 0;
    let outOfStockCount = 0;

    products.forEach((p) => {
      p.filterSizes?.forEach((s) => sizeSet.add(s));
      p.filterColor?.forEach((c) => colorSet.add(c));
      if (p.price > maxP) maxP = p.price;
      if (p.inStock) inStockCount++;
      else outOfStockCount++;
    });

    return {
      sizes: Array.from(sizeSet),
      // Resolved to a real swatch. This built `bg-color-${name}` before, which
      // for an Arabic colour name produced a class like `bg-color-أسود` that no
      // stylesheet defines — so every filter swatch rendered blank.
      colors: Array.from(colorSet).map((c) => ({
        name: c,
        swatch: resolveColor(c),
      })),
      maxPrice: maxP,
      availabilityCounts: {
        true: inStockCount,
        false: outOfStockCount,
      },
    };
  }, [products]);

  const availabilityOptions = [
    { label: "In Stock", value: true },
    { label: "Out of Stock", value: false },
  ];

  return (
    <div className="offcanvas offcanvas-start canvas-filter" id="filterShop">
      <div className="canvas-wrapper">
        <div className="canvas-header">
          <h5>{t("filters") || "Filters"}</h5>
          <span
            className="icon-close icon-close-popup"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
          />
        </div>
        <div className="canvas-body">
          <div className="widget-facet facet-price">
            <h6 className="facet-title">Price</h6>
            <RangeSlider
              min={0}
              max={maxPrice + 100}
              value={allProps.price || [0, maxPrice]}
              onInput={(value) => allProps.setPrice(value)}
            />
            <div className="box-price-product mt-3">
              <div className="box-price-item">
                <span className="title-price">Min price</span>
                <div
                  className="price-val"
                  id="price-min-value"
                  data-currency="$"
                >
                  {allProps.price ? allProps.price[0] : 0}
                </div>
              </div>
              <div className="box-price-item">
                <span className="title-price">Max price</span>
                <div
                  className="price-val"
                  id="price-max-value"
                  data-currency="$"
                >
                  {allProps.price ? allProps.price[1] : maxPrice}
                </div>
              </div>
            </div>
          </div>
          
          {sizes.length > 0 && (
            <div className="widget-facet facet-size">
              <h6 className="facet-title">Size</h6>
              <div className="facet-size-box size-box">
                {sizes.map((size, index) => (
                  <span
                    key={index}
                    onClick={() => allProps.setSize(size)}
                    className={`size-item size-check ${
                      allProps.size === size ? "active" : ""
                    }`}
                  >
                    {size}
                  </span>
                ))}
                <span
                  className={`size-item size-check free-size ${
                    allProps.size == "Free Size" ? "active" : ""
                  } `}
                  onClick={() => allProps.setSize("Free Size")}
                >
                  Free Size
                </span>
              </div>
            </div>
          )}

          {colors.length > 0 && (
            <div className="widget-facet facet-color">
              <h6 className="facet-title">Colors</h6>
              <div className="facet-color-box">
                {colors.map((color, index) => (
                  <div
                    onClick={() => allProps.setColor(color)}
                    key={index}
                    className={`color-item color-check ${
                      color.name == allProps.color?.name || color.name == allProps.color ? "active" : ""
                    }`}
                  >
                    <span
                      className={`color ${color.swatch.isLight ? "line" : ""}`}
                      style={{ backgroundColor: color.swatch.hex }}
                    />
                    {color.name}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="widget-facet facet-fieldset">
            <h6 className="facet-title">Availability</h6>
            <div className="box-fieldset-item">
              {availabilityOptions.map((option, index) => (
                <fieldset
                  key={index}
                  className="fieldset-item"
                  onClick={() => allProps.setAvailability(option)}
                >
                  <input
                    type="radio"
                    name="availability"
                    className="tf-check"
                    readOnly
                    checked={allProps.availability?.value === option.value}
                  />
                  <label>
                    {option.label}{" "}
                    <span className="count-stock">
                      ({availabilityCounts[option.value]})
                    </span>
                  </label>
                </fieldset>
              ))}
            </div>
          </div>
        </div>
        <div className="canvas-bottom">
          <button
            id="reset-filter"
            onClick={allProps.clearFilter}
            className="tf-btn btn-reset"
          >
            {t("resetFilters")}
          </button>
        </div>
      </div>
    </div>
  );
}
