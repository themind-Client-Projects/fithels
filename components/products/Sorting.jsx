"use client";
import { useTranslations } from "next-intl";

/**
 * The `value` is the sort key Products1 compares against
 * (`sortingOption === "Price Ascending"`), so it stays English and untranslated.
 * Only `labelKey` is localised — translating the value would silently break
 * sorting in Arabic, which is the trap the home page's filter tabs already fell
 * into.
 */
const SORT_OPTIONS = [
  { value: "Sort by (Default)", labelKey: "sortDefault" },
  { value: "Title Ascending", labelKey: "sortTitleAsc" },
  { value: "Title Descending", labelKey: "sortTitleDesc" },
  { value: "Price Ascending", labelKey: "sortPriceAsc" },
  { value: "Price Descending", labelKey: "sortPriceDesc" },
];

export default function Sorting({ allProps }) {
  const t = useTranslations("shop");

  const activeLabel =
    SORT_OPTIONS.find((option) => option.value === allProps.sortingOption)
      ?.labelKey ?? "sortDefault";

  return (
    <div className="tf-dropdown-sort" data-bs-toggle="dropdown">
      <div className="btn-select">
        <span className="text-sort-value">{t(activeLabel)}</span>
        <span className="icon icon-arrow-down" />
      </div>
      <div className="dropdown-menu">
        {SORT_OPTIONS.map((option) => (
          <div
            onClick={() => allProps.setSortingOption(option.value)}
            key={option.value}
            className={`select-item ${
              allProps.sortingOption === option.value ? "active" : ""
            }`}
          >
            <span className="text-value-item">{t(option.labelKey)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
