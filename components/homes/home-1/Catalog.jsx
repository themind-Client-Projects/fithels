"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * Two side-by-side clickable image panels.
 *
 * These are editable now. Pass up to two banners with placement CATALOG and each
 * panel takes its image, title, button text and — the point of the exercise —
 * its link from the admin, so a panel can lead straight to a product instead of
 * to the shop listing.
 *
 * The hardcoded props remain as fallbacks so the section still renders before
 * any catalogue banner has been created; a home page with two blank panels
 * would be a worse default than the artwork that shipped with it.
 */
export default function Catalog({
  banners = [],
  locale = "ar",
  leftImage = "/images/banner/catalog-left.png",
  rightImage = "/images/banner/catalog-right.png",
  leftAlt = "Fit Women Heels Collection",
  rightAlt = "Fit Women Heels Products",
  leftLabel = "NEW COLLECTION",
  rightLabel = "BEST SELLERS",
  leftCta = "Shop Now →",
  rightCta = "Explore →",
  leftHref = "/shop-default-grid",
  rightHref = "/shop-default-grid",
}) {
  const resolvePanel = (banner, fallback) => {
    const title = locale === "ar" ? banner?.titleAr : banner?.titleEn;
    const cta = locale === "ar" ? banner?.btnTextAr : banner?.btnTextEn;
    const href = banner?.link || fallback.href;
    return {
      image: banner?.image || fallback.image,
      alt: title || fallback.alt,
      label: title || fallback.label,
      cta: cta || fallback.cta,
      // Admin links are stored site-relative ("/product-detail/slug"), and the
      // built-in fallbacks carry no locale either. Prefixing here means the
      // click lands directly instead of bouncing through a locale redirect.
      href:
        /^https?:\/\//.test(href) || href.startsWith(`/${locale}`)
          ? href
          : `/${locale}${href.startsWith("/") ? "" : "/"}${href}`,
    };
  };

  const left = resolvePanel(banners[0], {
    image: leftImage,
    alt: leftAlt,
    label: leftLabel,
    cta: leftCta,
    href: leftHref,
  });
  const right = resolvePanel(banners[1], {
    image: rightImage,
    alt: rightAlt,
    label: rightLabel,
    cta: rightCta,
    href: rightHref,
  });
  return (
    <section
      style={{
        width: "100%",
        overflow: "hidden",

      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          width: "100%",
          minHeight: "90vh",
        }}
        className="catalog-wrapper"
      >
        {/* Left Panel */}
        <Link
          href={left.href}
          style={{
            position: "relative",
            flex: "1 1 50%",
            minHeight: "500px",
            display: "block",
            overflow: "hidden",
            cursor: "pointer",
          }}
          className="catalog-panel"
        >
          <Image
            src={left.image}
            alt={left.alt}
            fill
            style={{ objectFit: "cover", transition: "transform 0.7s ease" }}
            sizes="(max-width: 767px) 100vw, 50vw"
            className="catalog-img"
          />
          <div className="catalog-overlay">
            <span className="catalog-label">{left.label}</span>
            <span className="catalog-cta">{left.cta}</span>
          </div>
        </Link>

        {/* Right Panel */}
        <Link
          href={right.href}
          style={{
            position: "relative",
            flex: "1 1 50%",
            minHeight: "500px",
            display: "block",
            overflow: "hidden",
            cursor: "pointer",
          }}
          className="catalog-panel"
        >
          <Image
            src={right.image}
            alt={right.alt}
            fill
            style={{ objectFit: "cover", transition: "transform 0.7s ease" }}
            sizes="(max-width: 767px) 100vw, 50vw"
            className="catalog-img"
          />
          <div className="catalog-overlay">
            <span className="catalog-label">{right.label}</span>
            <span className="catalog-cta">{right.cta}</span>
          </div>
        </Link>
      </div>

      <style jsx>{`
        .catalog-panel:hover .catalog-img {
          transform: scale(1.05);
        }
        .catalog-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 40px 30px;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.5));
          display: flex;
          flex-direction: column;
          gap: 8px;
          opacity: 0;
          transition: opacity 0.5s ease;
        }
        .catalog-panel:hover .catalog-overlay {
          opacity: 1;
        }
        .catalog-label {
          color: #fff;
          font-size: 22px;
          font-weight: 600;
          letter-spacing: 3px;
          font-family: "Playfair Display", Georgia, serif;
        }
        .catalog-cta {
          color: rgba(255, 255, 255, 0.85);
          font-size: 14px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }
        @media (max-width: 768px) {
          .catalog-wrapper {
            flex-direction: column !important;
            min-height: auto !important;
          }
          .catalog-wrapper > a {
            min-height: 50vh !important;
          }
          .catalog-overlay {
            opacity: 1;
            padding: 24px 20px;
          }
          .catalog-label {
            font-size: 18px;
          }
        }
      `}</style>
    </section>
  );
}
