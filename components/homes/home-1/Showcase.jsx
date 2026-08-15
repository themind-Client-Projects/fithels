"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

export default function Showcase() {
  const locale = useLocale();
  const t = useTranslations("home.showcase");
  return (
    <section
      style={{
        width: "100%",
        overflow: "hidden",

      }}
    >
      <Link
        href={`/${locale}/shop-default-grid`}
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
          src="/images/banner/showcase-banner.png"
          alt="Fit Women Heels - Exclusive Collection"
          fill
          style={{ objectFit: "cover", transition: "transform 0.8s ease" }}
          sizes="100vw"
          priority
          className="showcase-img"
        />
        {/* Centered overlay text */}
        <div className="showcase-overlay">
          <span className="showcase-subtitle">{t("subtitle")}</span>
          <span className="showcase-title">{t("title")}</span>
          <span className="showcase-btn">{t("btn")}</span>
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
