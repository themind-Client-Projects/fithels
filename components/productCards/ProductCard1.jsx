"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import CountdownTimer from "../common/Countdown";
import { useContextElement } from "@/context/Context";
import { useLocale } from "next-intl";
import { buildSizeOptions } from "@/lib/products/sizes";
import CurrencyFormatter from "@/components/common/CurrencyFormatter";
export default function ProductCard1({
  product,
  gridClass = "",
  parentClass = "card-product wow fadeInUp",
  isNotImageRatio = false,
  radiusClass = "",
}) {
  const [currentImage, setCurrentImage] = useState(product.imgSrc);
  const locale = useLocale();

  // Only quick view remains on the card; the wishlist, compare and add-to-cart
  // handlers went with their buttons.
  const { setQuickViewItem } = useContextElement();

  useEffect(() => {
    setCurrentImage(product.imgSrc);
  }, [product]);

  return (
    <div
      className={`${parentClass} ${gridClass} ${
        product.isOnSale ? "on-sale" : ""
      } ${product.sizes ? "card-product-size" : ""}`}
    >
      <div
        className={`card-product-wrapper ${
          isNotImageRatio ? "aspect-ratio-0" : ""
        } ${radiusClass} `}
      >
        <Link href={`/${locale}/product-detail/${product.id}`} className="product-img">
          <Image
            className="lazyload img-product"
            src={currentImage}
            alt={product.title}
            width={600}
            height={800}
            // Grid is 4-up on desktop, 2-up on tablet, 1-up on phones. Without
            // this the optimiser assumes full width and ships the largest file.
            sizes="(max-width: 575px) 100vw, (max-width: 991px) 50vw, 25vw"
          />

          <Image
            className="lazyload img-hover"
            src={product.imgHover}
            alt={product.title}
            width={600}
            height={800}
            sizes="(max-width: 575px) 100vw, (max-width: 991px) 50vw, 25vw"
          />
        </Link>
        {product.hotSale && (
          <div className="marquee-product bg-main">
            <div className="marquee-wrapper">
              <div className="initial-child-container">
                <div className="marquee-child-item">
                  <p className="font-2 text-btn-uppercase fw-6 text-white">
                    Hot Sale 25% OFF
                  </p>
                </div>
                <div className="marquee-child-item">
                  <span className="icon icon-lightning text-critical" />
                </div>
                <div className="marquee-child-item">
                  <p className="font-2 text-btn-uppercase fw-6 text-white">
                    Hot Sale 25% OFF
                  </p>
                </div>
                <div className="marquee-child-item">
                  <span className="icon icon-lightning text-critical" />
                </div>
                <div className="marquee-child-item">
                  <p className="font-2 text-btn-uppercase fw-6 text-white">
                    Hot Sale 25% OFF
                  </p>
                </div>
                <div className="marquee-child-item">
                  <span className="icon icon-lightning text-critical" />
                </div>
                <div className="marquee-child-item">
                  <p className="font-2 text-btn-uppercase fw-6 text-white">
                    Hot Sale 25% OFF
                  </p>
                </div>
                <div className="marquee-child-item">
                  <span className="icon icon-lightning text-critical" />
                </div>
                <div className="marquee-child-item">
                  <p className="font-2 text-btn-uppercase fw-6 text-white">
                    Hot Sale 25% OFF
                  </p>
                </div>
                <div className="marquee-child-item">
                  <span className="icon icon-lightning text-critical" />
                </div>
              </div>
            </div>
            <div className="marquee-wrapper">
              <div className="initial-child-container">
                <div className="marquee-child-item">
                  <p className="font-2 text-btn-uppercase fw-6 text-white">
                    Hot Sale 25% OFF
                  </p>
                </div>
                <div className="marquee-child-item">
                  <span className="icon icon-lightning text-critical" />
                </div>
                <div className="marquee-child-item">
                  <p className="font-2 text-btn-uppercase fw-6 text-white">
                    Hot Sale 25% OFF
                  </p>
                </div>
                <div className="marquee-child-item">
                  <span className="icon icon-lightning text-critical" />
                </div>
                <div className="marquee-child-item">
                  <p className="font-2 text-btn-uppercase fw-6 text-white">
                    Hot Sale 25% OFF
                  </p>
                </div>
                <div className="marquee-child-item">
                  <span className="icon icon-lightning text-critical" />
                </div>
                <div className="marquee-child-item">
                  <p className="font-2 text-btn-uppercase fw-6 text-white">
                    Hot Sale 25% OFF
                  </p>
                </div>
                <div className="marquee-child-item">
                  <span className="icon icon-lightning text-critical" />
                </div>
                <div className="marquee-child-item">
                  <p className="font-2 text-btn-uppercase fw-6 text-white">
                    Hot Sale 25% OFF
                  </p>
                </div>
                <div className="marquee-child-item">
                  <span className="icon icon-lightning text-critical" />
                </div>
              </div>
            </div>
          </div>
        )}
        {product.isOnSale && (
          <div className="on-sale-wrap">
            <span className="on-sale-item">-{product.salePercentage}</span>
          </div>
        )}
        {product.sizes && (
          <div className="variant-wrap size-list">
            <ul className="variant-box">
              {/* The whole size run, not only the sizes this product carries, so
                  a gap reads as "sold out in that size" rather than as a size
                  the shop has never heard of. Availability comes straight from
                  Product.sizes; buildSizeOptions only decides what to show and
                  in what order, and never hides a size the product does have. */}
              {buildSizeOptions(product.sizes).map(({ size, available }) => (
                <li
                  key={size}
                  className={`size-item${available ? "" : " size-item--out"}`}
                  title={
                    available
                      ? undefined
                      : locale === "ar"
                      ? "غير متوفر"
                      : "Not available"
                  }
                >
                  {size}
                </li>
              ))}
            </ul>
          </div>
        )}
        {product.countdown && (
          <div className="variant-wrap countdown-wrap">
            <div className="variant-box">
              <div
                className="js-countdown"
                data-timer={product.countdown}
                data-labels="D :,H :,M :,S"
              >
                <CountdownTimer />
              </div>
            </div>
          </div>
        )}
        {product.oldPrice ? (
          <div className="on-sale-wrap">
            <span className="on-sale-item">-25%</span>
          </div>
        ) : (
          ""
        )}
        {/* Wishlist and compare were removed from the card deliberately, along
            with the add-to-cart button.
            Add-to-cart could not honour what it promised: a shoe has a size and
            a colour, and the card has neither picker, so it added whichever
            variant the fallback happened to choose. Buying now goes through the
            product page, where the shopper picks the combinations they want.
            Quick view is kept — it is the one action on the card that only
            shows information rather than committing to a purchase.
            The wishlist and compare features themselves are untouched; they are
            still reachable from the quick view and quick add modals. */}
        <div className="list-product-btn">
          <a
            href="#quickView"
            onClick={() => setQuickViewItem(product)}
            data-bs-toggle="modal"
            className="box-icon quickview tf-btn-loading"
          >
            <span className="icon icon-eye" />
            <span className="tooltip">Quick View</span>
          </a>
        </div>
      </div>
      <div className="card-product-info">
        {/* card-stretch-link paints an overlay across the whole card (see
            globals.css), so the image, the price and the empty space are all
            part of this one link rather than only the title text. The overlay
            approach is used instead of wrapping the card in an <a> because the
            card also holds buttons — add-to-cart, wishlist, quick view — and
            nesting those inside an anchor is invalid and breaks their clicks. */}
        <Link
          href={`/${locale}/product-detail/${product.id}`}
          className="title link card-stretch-link"
        >
          {product.title}
        </Link>
        {/* The price actually charged comes FIRST in the DOM, the struck-through
            one after it. Inline order follows the text direction, so in this
            RTL storefront that puts what the shopper pays on the right — read
            first — and the old price to its left. The template had them the
            other way round, so the eye landed on the crossed-out number. */}
        <span className="price">
          <CurrencyFormatter price={product.price} />
          {product.oldPrice && (
            <span className="old-price">
              <CurrencyFormatter price={product.oldPrice} />
            </span>
          )}
        </span>
        {product.colors?.length > 0 && (
          <ul className="list-color-product">
            {product.colors.map((color, index) => {
              // Colours arrive resolved from lib/products/colors. The swatch is
              // painted inline because the stored names are Arabic, so there is
              // no utility class to reach for — the previous `bg-main` class
              // rendered every colour of a product as the same black dot.
              const label = locale === "en" ? color.nameEn : color.nameAr;
              return (
                <li
                  key={color.key ?? index}
                  className={`list-color-item color-swatch ${
                    currentImage == color.imgSrc ? "active" : ""
                  } ${color.isLight ? "line" : ""}`}
                  onMouseOver={() => color.imgSrc && setCurrentImage(color.imgSrc)}
                  title={label}
                >
                  <span
                    className="swatch-value"
                    style={{ backgroundColor: color.hex }}
                    aria-label={label}
                  />
                  {color.imgSrc && (
                    <Image
                      className="lazyload"
                      src={color.imgSrc}
                      alt={label}
                      width={600}
                      height={800}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
