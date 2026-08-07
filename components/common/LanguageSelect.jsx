"use client";
import React, { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";

const languageOptions = [
  { id: "en", label: "English" },
  { id: "ar", label: "العربية" },
];

export default function LanguageSelect({
  parentClassName = "image-select center style-default type-languages",
  topStart = false,
}) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const currentOption = languageOptions.find((opt) => opt.id === locale) || languageOptions[0];
  const [selected, setSelected] = useState(currentOption);
  const [isDDOpen, setIsDDOpen] = useState(false);
  const languageSelect = useRef();

  useEffect(() => {
    setSelected(languageOptions.find((opt) => opt.id === locale) || languageOptions[0]);
  }, [locale]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        languageSelect.current &&
        !languageSelect.current.contains(event.target)
      ) {
        setIsDDOpen(false); // Close the dropdown if click is outside
      }
    };
    // Add the event listener when the component mounts
    document.addEventListener("click", handleClickOutside);

    // Cleanup the event listener when the component unmounts
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  const handleLanguageChange = (elm) => {
    setSelected(elm);
    setIsDDOpen(false);
    startTransition(() => {
      router.replace(pathname, { locale: elm.id });
    });
  };

  return (
    <>
      <div
        className={`dropdown bootstrap-select ${parentClassName}  dropup ${isPending ? 'opacity-50' : ''}`}
        onClick={() => setIsDDOpen((pre) => !pre)}
        ref={languageSelect}
      >
        <select
          className="image-select center style-default type-languages"
          tabIndex="null"
          value={selected.id}
          onChange={() => {}}
        >
          {languageOptions.map((option, i) => (
            <option key={i} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          tabIndex={-1}
          className={`btn dropdown-toggle btn-light  ${
            isDDOpen ? "show" : ""
          } `}
        >
          <div className="filter-option">
            <div className="filter-option-inner">
              <div className="filter-option-inner-inner">{selected.label}</div>
            </div>
          </div>
        </button>
        <div
          className={`dropdown-menu ${isDDOpen ? "show" : ""} `}
          style={{
            maxHeight: "899.688px",
            overflow: "hidden",
            minHeight: 0,
            position: "absolute",
            inset: topStart ? "" : "auto auto 0px 0px",
            margin: 0,
            transform: `translate(0px, ${topStart ? 22 : -20}px)`,
          }}
          data-popper-placement={`${!topStart ? "top" : "bottom"}-start`}
        >
          <div
            className="inner show"
            style={{
              maxHeight: "869.688px",
              overflowY: "auto",
              minHeight: 0,
            }}
          >
            <ul
              className="dropdown-menu inner show"
              role="presentation"
              style={{ marginTop: 0, marginBottom: 0 }}
            >
              {languageOptions.map((elm, i) => (
                <li
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLanguageChange(elm);
                  }}
                  className={`selected ${selected.id === elm.id ? "active" : ""}`}
                >
                  <a
                    className={`dropdown-item ${
                      selected.id === elm.id ? "active selected" : ""
                    }`}
                  >
                    <span className="text">{elm.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
