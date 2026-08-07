"use client";
import { Link } from "@/i18n/navigation";
import React from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

export default function Nav() {
  const pathname = usePathname();
  const t = useTranslations("nav");
  return (
    <>
      <li className={`menu-item ${pathname === "/" ? "active" : ""}`}>
        <Link href="/" className="item-link">
          {t("home")}
        </Link>
      </li>
      <li
        className={`menu-item ${
          pathname.startsWith("/shop") ? "active" : ""
        }`}
      >
        <Link href="/shop-default-grid" className="item-link">
          {t("shop")}
        </Link>
      </li>
      <li
        className={`menu-item ${
          pathname.startsWith("/about") ? "active" : ""
        }`}
      >
        <Link href="/about-us" className="item-link">
          {t("about")}
        </Link>
      </li>
      <li
        className={`menu-item ${
          pathname.startsWith("/contact") ? "active" : ""
        }`}
      >
        <Link href="/contact" className="item-link">
          {t("contact")}
        </Link>
      </li>
    </>
  );
}
