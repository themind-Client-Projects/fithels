"use client";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Pagination } from "swiper/modules";
import ImageWithSkeleton from "@/components/common/ImageWithSkeleton";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

/** Banner copy in the active language, falling back to the other one. */
const bannerHeading = (banner, locale) =>
  !banner ? null : locale === "ar" ? banner.titleAr || banner.titleEn : banner.titleEn || banner.titleAr;

const bannerBtn = (banner, locale) =>
  !banner ? null : locale === "ar" ? banner.btnTextAr || banner.btnTextEn : banner.btnTextEn || banner.btnTextAr;

/**
 * Home hero.
 *
 * Slides come from the admin-managed Banner records, whose images are uploaded
 * to Supabase. They used to come from data/heroSlides.js — two hardcoded
 * Unsplash URLs, one of which had 404'd upstream, so the live storefront was
 * showing a broken hero image sourced from someone else's CDN.
 *
 * When no banner is configured the translated copy still renders over a plain
 * background, so the section never collapses.
 */
export default function Hero({ banners = [] }) {
  const t = useTranslations("home.hero");
  const locale = useLocale();
  return (
    <section className="tf-slideshow slider-default slider-effect-fade">
      <Swiper
        effect="fade"
        spaceBetween={0}
        centeredSlides={false}
        slidesPerView={1}
        loop={true}
        modules={[EffectFade, Autoplay, Pagination]}
        // autoplay={{ delay: 3000 }}
        dir="ltr"
        pagination={{
          clickable: true,
          el: ".spd55",
        }}
        className="swiper tf-sw-slideshow"
      >
        {(banners.length ? banners : [null]).map((banner, index) => (
          <SwiperSlide key={index}>
            <div className="wrap-slider" style={{ maxHeight: "800px" }}>
              {banner?.image && (
              <ImageWithSkeleton
                alt={banner.titleAr || banner.titleEn || "slide"}
                src={banner.image}
                width={1920}
                height={600}
                style={{ maxHeight: "800px", objectFit: "cover", width: "100%", height: "100%" }}
                // Full-bleed hero and the LCP element: priority preloads it,
                // sizes stops the optimiser serving a 1920px file to a phone.
                sizes="100vw"
                priority={index === 0}
                fetchPriority={index === 0 ? "high" : "auto"}
              />
              )}
              <div className="box-content">
                <div className="content-slider">
                  <div className="box-title-slider">
                    <p className="fade-item fade-item-1 subheading text-btn-uppercase text-white">
                      {banner?.titleEn && index > 0 ? banner.titleEn : t(`slide${Math.min(index, 1)}.subheading`)}
                    </p>
                    <div className="fade-item fade-item-2 heading text-white title-display">
                      {String(bannerHeading(banner, locale) || t(`slide${Math.min(index, 1)}.heading`)).split("\n").map((line, idx) => (
                        <span key={idx}>
                          {line}
                          <br />
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="fade-item fade-item-3 box-btn-slider">
                    <Link
                      href={banner?.link || `/${locale}/shop-default-grid`}
                      className="tf-btn btn-fill btn-white"
                    >
                      <span className="text">{bannerBtn(banner, locale) || t(`slide${Math.min(index, 1)}.btnText`)}</span>
                      <i className="icon icon-arrowUpRight" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      <div className="wrap-pagination">
        <div className="container">
          <div className="sw-dots sw-pagination-slider type-circle white-circle justify-content-center spd55" />
        </div>
      </div>
    </section>
  );
}
