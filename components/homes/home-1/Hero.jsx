"use client";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Pagination } from "swiper/modules";
import { slides } from "@/data/heroSlides";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function Hero() {
  const t = useTranslations("home.hero");
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
        {slides.map((slide, index) => (
          <SwiperSlide key={index}>
            <div className="wrap-slider" style={{ maxHeight: "800px" }}>
              <Image
                alt={slide.alt}
                src={slide.imgSrc}
                width={1920}
                height={600}
                style={{ maxHeight: "800px", objectFit: "cover", width: "100%", height: "100%" }}
                // Full-bleed hero and the LCP element: priority preloads it,
                // sizes stops the optimiser serving a 1920px file to a phone.
                sizes="100vw"
                priority
                fetchPriority="high"
              />
              <div className="box-content">
                <div className="content-slider">
                  <div className="box-title-slider">
                    <p className="fade-item fade-item-1 subheading text-btn-uppercase text-white">
                      {t(`slide${index}.subheading`) || slide.subheading}
                    </p>
                    <div className="fade-item fade-item-2 heading text-white title-display">
                      {String(t(`slide${index}.heading`) || slide.heading).split("\n").map((line, idx) => (
                        <span key={idx}>
                          {line}
                          <br />
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="fade-item fade-item-3 box-btn-slider">
                    <Link
                      href={`/shop-default-grid`}
                      className="tf-btn btn-fill btn-white"
                    >
                      <span className="text">{t(`slide${index}.btnText`) || slide.btnText}</span>
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
