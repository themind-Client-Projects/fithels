import React from "react";
import { Link } from "@/i18n/navigation";
import LanguageSelect from "../common/LanguageSelect";
import CurrencySelect from "../common/CurrencySelect";
import {useTranslations} from "next-intl";
import { siteContact, telHref } from "@/data/siteContact";

export default function Topbar() {
  const t = useTranslations("nav");
  return (
    <div className="tf-topbar bg-main">
      <div className="container">
        <div className="tf-topbar_wrap d-flex align-items-center justify-content-center justify-content-xl-between">
          <ul className="topbar-left">
            {siteContact.phone && (
              <li>
                <a
                  className="text-caption-1 text-white"
                  href={telHref(siteContact.phone)}
                  dir="ltr"
                >
                  {siteContact.phone}
                </a>
              </li>
            )}
            {siteContact.email ? (
              <li>
                {/* Was href="#", so tapping the address in the topbar did
                    nothing at all. */}
                <a
                  className="text-caption-1 text-white"
                  href={`mailto:${siteContact.email}`}
                >
                  {siteContact.email}
                </a>
              </li>
            ) : siteContact.handle ? (
              // A handle is not an address, so it is plain text — a mailto
              // link here would open an empty compose window.
              <li>
                <span className="text-caption-1 text-white">{siteContact.handle}</span>
              </li>
            ) : null}
            <li>
              <Link
                className="text-caption-1 text-white text-decoration-underline"
                href="/contact"
              >
                {t("ourStore", { defaultMessage: "Our Store" })}
              </Link>
            </li>
          </ul>
          <div className="topbar-right d-none d-xl-block">
            <div className="tf-cur justify-content-end">
              <div className="tf-currencies">
                <CurrencySelect light topStart />
              </div>
              <div className="tf-languages position-relative">
                <LanguageSelect
                  parentClassName="image-select center style-default type-languages color-white"
                  topStart={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
