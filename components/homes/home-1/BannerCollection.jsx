import React from "react";
import Image from "next/image";
import Link from "next/link";

export default function BannerCollection({ banners = [], locale = "ar" }) {
  if (!banners || banners.length === 0) return null;

  return (
    <section className="flat-spacing pt-0">
      <div className="container">
        <div className={`tf-grid-layout md-col-${Math.min(banners.length, 2)}`}>
          {banners.map((banner, index) => (
            <div key={banner.id} className="collection-default hover-img">
              <a className="img-style">
                <Image
                  className="lazyload"
                  data-src={banner.image}
                  alt={locale === "ar" ? banner.titleAr : banner.titleEn}
                  src={banner.image}
                  width={945}
                  height={709}
                />
              </a>
              <div className="content">
                <h3 className="title wow fadeInUp">
                  <Link href={banner.link || "#"} className="link">
                    {locale === "ar" ? banner.titleAr : banner.titleEn}
                  </Link>
                </h3>
                {banner.btnTextAr || banner.btnTextEn ? (
                  <div className="wow fadeInUp mt-4">
                    <Link href={banner.link || "#"} className="btn-line">
                      {locale === "ar" ? banner.btnTextAr : banner.btnTextEn}
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
