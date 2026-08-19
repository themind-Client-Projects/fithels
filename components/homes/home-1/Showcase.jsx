"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

/**
 * The single full-bleed feature panel.
 *
 * Editable now: pass a banner with placement SHOWCASE and it supplies the image,
 * the kicker, the heading, the button text and — the point — the link, so the
 * panel can lead to a specific product instead of the shop listing.
 *
 * Everything falls back to what shipped (the bundled artwork and the
 * home.showcase translations), so the section still renders before any showcase
 * banner exists rather than going blank.
 */
export default function Showcase({ banner = null }) {
  const locale = useLocale();
  const t = useTranslations("home.showcase");

  const ar = locale === "ar";
  const image = banner?.image || "/images/banner/showcase-banner.png";
  const subtitle = (ar ? banner?.subtitleAr : banner?.subtitleEn) || t("subtitle");
  const title = (ar ? banner?.titleAr : banner?.titleEn) || t("title");
  const cta = (ar ? banner?.btnTextAr : banner?.btnTextEn) || t("btn");

  // Admin links are stored site-relative; prefix the locale so the click lands
  // directly rather than bouncing through a redirect.
  const rawHref = banner?.link || "/shop-default-grid";
  const href =
    /^https?:\/\//.test(rawHref) || rawHref.startsWith(`/${locale}`)
      ? rawHref
      : `/${locale}${rawHref.startsWith("/") ? "" : "/"}${rawHref}`;

  return (
    <section
      style={{
        width: "100%",
        overflow: "hidden",

      }}
    >
      <Link
        href={href}
        style={{
          display: "block",
          position: "relative",
          width: "100%",
          height: "60vh",
          minHeight: "400px",
          overflow: "hidden",
          cursor: "pointer",
        }}
        className="showcase-link"
      >
        <Image
          src={image}
          alt={title}
          fill
          style={{ objectFit: "cover", transition: "transform 0.8s ease" }}
          sizes="100vw"
          priority
          className="showcase-img"
        />
        {/* Centered overlay text */}
        <div className="showcase-overlay">
          <span className="showcase-subtitle">{subtitle}</span>
          <span className="showcase-title">{title}</span>
          <span className="showcase-btn">{cta}</span>
        </div>
      </Link>

      <style jsx>{`
        .showcase-link:hover .showcase-img {
          transform: scale(1.04);
        }
        .showcase-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: rgba(0, 0, 0, 0.25);
          transition: background 0.5s ease;
        }
        .showcase-link:hover .showcase-overlay {
          background: rgba(0, 0, 0, 0.35);
        }
        .showcase-subtitle {
          color: rgba(255, 255, 255, 0.85);
          font-size: 13px;
          letter-spacing: 4px;
          text-transform: uppercase;
          font-weight: 500;
        }
        .showcase-title {
          color: #fff;
          font-size: 42px;
          font-weight: 600;
          letter-spacing: 2px;
          font-family: "Playfair Display", Georgia, serif;
          text-align: center;
        }
        .showcase-btn {
          margin-top: 8px;
          color: #fff;
          font-size: 13px;
          letter-spacing: 3px;
          padding: 12px 32px;
          border: 1.5px solid rgba(255, 255, 255, 0.7);
          transition: all 0.3s ease;
        }
        .showcase-link:hover .showcase-btn {
          background: #fff;
          color: #1a1a2e;
          border-color: #fff;
        }
        @media (max-width: 768px) {
          .showcase-title {
            font-size: 28px;
          }
          .showcase-btn {
            padding: 10px 24px;
            font-size: 11px;
          }
        }
      `}</style>
    </section>
  );
}
