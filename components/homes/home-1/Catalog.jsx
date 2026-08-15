"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * Reusable Catalog section — two side-by-side clickable image panels.
 * Props will come from backend later (Prisma/Supabase).
 */
export default function Catalog({
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
          href={leftHref}
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
            src={leftImage}
            alt={leftAlt}
            fill
            style={{ objectFit: "cover", transition: "transform 0.7s ease" }}
            sizes="(max-width: 767px) 100vw, 50vw"
            className="catalog-img"
          />
          <div className="catalog-overlay">
            <span className="catalog-label">{leftLabel}</span>
            <span className="catalog-cta">{leftCta}</span>
          </div>
        </Link>

        {/* Right Panel */}
        <Link
          href={rightHref}
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
            src={rightImage}
            alt={rightAlt}
            fill
            style={{ objectFit: "cover", transition: "transform 0.7s ease" }}
            sizes="(max-width: 767px) 100vw, 50vw"
            className="catalog-img"
          />
          <div className="catalog-overlay">
            <span className="catalog-label">{rightLabel}</span>
            <span className="catalog-cta">{rightCta}</span>
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
