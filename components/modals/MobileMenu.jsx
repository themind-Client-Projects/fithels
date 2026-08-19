"use client";
import React from "react";
import Link from "next/link";
import LanguageSelect from "../common/LanguageSelect";
import CurrencySelect from "../common/CurrencySelect";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { siteContact, telHref } from "@/data/siteContact";
export default function MobileMenu() {
  const tNav = useTranslations("nav");
  const tContact = useTranslations("contact");
  const locale = useLocale();
  const pathname = usePathname();
  return (
    <div className="offcanvas offcanvas-start canvas-mb" id="mobileMenu">
      <span
        className="icon-close icon-close-popup"
        data-bs-dismiss="offcanvas"
        aria-label="Close"
      />
      <div className="mb-canvas-content">
        <div className="mb-body">
          <div className="mb-content-top">
            <ul className="nav-ul-mb" id="wrapper-menu-navigation">
              <li className="nav-mb-item">
                <Link
                  href={`/${locale}`}
                  className={`mb-menu-link ${pathname === "/" ? "active" : ""}`}
                >
                  {tNav('home')}
                </Link>
              </li>
              <li className="nav-mb-item">
                <Link
                  href={`/${locale}/shop-default-grid`}
                  className={`mb-menu-link ${pathname.startsWith("/shop") ? "active" : ""}`}
                >
                  {tNav('shop')}
                </Link>
              </li>
              <li className="nav-mb-item">
                <Link
                  href={`/${locale}/about-us`}
                  className={`mb-menu-link ${pathname.startsWith("/about") ? "active" : ""}`}
                >
                  {tNav('about')}
                </Link>
              </li>
              <li className="nav-mb-item">
                <Link
                  href={`/${locale}/contact`}
                  className={`mb-menu-link ${pathname.startsWith("/contact") ? "active" : ""}`}
                >
                  {tNav('contact')}
                </Link>
              </li>
            </ul>
          </div>
          <div className="mb-other-content">
            <div className="group-icon">
              <a href="#shopWishlist" data-bs-toggle="offcanvas" aria-controls="shopWishlist" className="site-nav-icon" role="button">
                <svg
                  className="icon"
                  width={18}
                  height={18}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20.8401 4.60987C20.3294 4.09888 19.7229 3.69352 19.0555 3.41696C18.388 3.14039 17.6726 2.99805 16.9501 2.99805C16.2276 2.99805 15.5122 3.14039 14.8448 3.41696C14.1773 3.69352 13.5709 4.09888 13.0601 4.60987L12.0001 5.66987L10.9401 4.60987C9.90843 3.57818 8.50915 2.99858 7.05012 2.99858C5.59109 2.99858 4.19181 3.57818 3.16012 4.60987C2.12843 5.64156 1.54883 7.04084 1.54883 8.49987C1.54883 9.95891 2.12843 11.3582 3.16012 12.3899L4.22012 13.4499L12.0001 21.2299L19.7801 13.4499L20.8401 12.3899C21.3511 11.8791 21.7565 11.2727 22.033 10.6052C22.3096 9.93777 22.4519 9.22236 22.4519 8.49987C22.4519 7.77738 22.3096 7.06198 22.033 6.39452C21.7565 5.72706 21.3511 5.12063 20.8401 4.60987V4.60987Z"
                    stroke="#181818"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {tNav('wishlist')}
              </a>
              <Link href={`/${locale}`} className="site-nav-icon">
                <svg
                  className="icon"
                  width={18}
                  height={18}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
                    stroke="#181818"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z"
                    stroke="#181818"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {tNav('login')}
              </Link>
            </div>
            <div className="mb-notice">
              <Link href={`/${locale}/contact`} className="text-need">
                {tNav('needHelp')}
              </Link>
            </div>
            {/* Directions need somewhere to direct to. With no address set this
                button pointed at the contact page under a label promising a
                route, so it is hidden until siteContact.address is filled in. */}
            {siteContact.address && (
              <div className="mb-contact">
                <p className="text-caption-1">{siteContact.address}</p>
                <Link
                  href={`/${locale}/contact`}
                  className="tf-btn-default text-btn-uppercase"
                >
                  {tNav('getDirection')}
                  <i className="icon-arrowUpRight" />
                </Link>
              </div>
            )}
            <ul className="mb-info">
              {siteContact.email ? (
                <li>
                  <i className="icon icon-mail" />
                  <p>
                    <a href={`mailto:${siteContact.email}`}>{siteContact.email}</a>
                  </p>
                </li>
              ) : siteContact.handle ? (
                <li>
                  {/* A social handle, not an address — icon-mail beside it read
                      as an email that could be written to. */}
                  <i className="icon icon-instagram" />
                  <p>{siteContact.handle}</p>
                </li>
              ) : null}
              {siteContact.whatsapp && (
                <li>
                  <i className="icon icon-whatsapp" />
                  {/* A label, not the number again. WhatsApp uses the same
                      line as the phone above it, so printing it twice read as
                      the list being broken rather than as two ways to reach the
                      shop. */}
                  <p>
                    <a
                      href={`https://wa.me/${siteContact.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {tNav('whatsapp')}
                    </a>
                  </p>
                </li>
              )}
              {siteContact.phone && (
                <li>
                  <i className="icon icon-phone" />
                  <p dir="ltr">
                    <a href={telHref(siteContact.phone)}>{siteContact.phone}</a>
                  </p>
                </li>
              )}
            </ul>
          </div>
        </div>
        <div className="mb-bottom">
          <div className="bottom-bar-language">
            <div className="tf-currencies">
              <CurrencySelect />
            </div>
            <div className="tf-languages">
              <LanguageSelect parentClassName="image-select center style-default type-languages" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
