"use client";
import React, { useEffect, useState } from "react";

/**
 * How many times the sale banner repeats.
 *
 * A marquee needs enough copies to fill the strip while it scrolls; five text
 * items with a bolt between them is what the original ten hand-written blocks
 * amounted to.
 */
const MARQUEE_REPEATS = 5;
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import CountdownTimer from "../common/Countdown";
import { useLocale } from "next-intl";
import { buildSizeOptions } from "@/lib/products/sizes";
import CurrencyFormatter from "@/components/common/CurrencyFormatter";
import { useCurrencyStore } from "@/stores/useCurrencyStore";
export default function ProductCard1({
  product,
  gridClass = "",
  parentClass = "card-product wow fadeInUp",
  isNotImageRatio = false,
  radiusClass = "",
}) {
  const [currentImage, setCurrentImage] = useState(product.imgSrc);
  const locale = useLocale();
  const t = useTranslations("shop");
  const { currency } = useCurrencyStore();

  useEffect(() => {
    setCurrentImage(product.imgSrc);
  }, [product]);

  /**
   * The sale facts for the currency actually on screen.
   *
   * The dollar and dinar prices are set independently, so a shoe can be 25% off
   * in dinars and 14% off in dollars at the same time — and the badge sits
   * directly above the price it describes. Quoting one currency's discount over
   * the other's price is a number that is simply not true.
   */
  const showingUsd = currency !== "IQD";
  const onSale = showingUsd ? product.isOnSaleUsd : product.isOnSale;
  const percentOff = showingUsd
    ? product.salePercentageUsd
    : product.salePercentage;
  const oldPriceShown = showingUsd ? product.oldPrice : product.oldPriceIqd;

  return (
    <div
      className={`${parentClass} ${gridClass} ${
        onSale ? "on-sale" : ""
      } ${product.sizes ? "card-product-size" : ""}`}
    >
      <div
        className={`card-product-wrapper ${
          isNotImageRatio ? "aspect-ratio-0" : ""
        } ${radiusClass} `}
      >
        <Link
          href={`/${locale}/product-detail/${product.id}`}
          className="product-img"
        >
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
        {onSale && (
          /* The banner used to be ten hand-written copies of "Hot Sale 25% OFF"
             — untranslated, so it read English over an Arabic card, and with the
             percentage typed in, so a shoe at 40% off still announced 25%. It is
             one translated string carrying the product's REAL discount now,
             repeated by the loop the marquee needs rather than by hand. */
          <div className="marquee-product bg-main">
            <div className="marquee-wrapper">
              <div className="initial-child-container">
                {Array.from({ length: MARQUEE_REPEATS }).map((_, i) => (
                  <React.Fragment key={i}>
                    <div className="marquee-child-item">
                      <p className="font-2 text-btn-uppercase fw-6 text-white">
                        {t("hotSale", {
                          percent: percentOff ?? "",
                        })}
                      </p>
                    </div>
                    <div className="marquee-child-item">
                      <span className="icon icon-lightning text-critical" />
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}
        {onSale && (
          <div className="on-sale-wrap">
            <span className="on-sale-item">-{percentOff}</span>
          </div>
        )}
        {product.sizes && (
          <div className="variant-wrap size-list">
            <ul className="variant-box">
              {/* Numeric products show the whole 35-41 ladder, so a gap reads
                  as "sold out in that size" rather than as a size the shop has
                  never heard of. Letter products show only what they are sold
                  in — XS/S is not a product missing XS. buildSizeOptions makes
                  that call from the system, which is why it must be passed;
                  defaulting to NUMERIC struck through six sizes that never
                  existed. It never hides a size the product does have. */}
              {buildSizeOptions(
                product.sizes,
                undefined,
                product.sizeSystem,
              ).map(({ size, available }) => (
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
          <CurrencyFormatter price={product.price} priceIqd={product.priceIqd} />
          {oldPriceShown && (
            <span className="old-price">
              <CurrencyFormatter
                price={product.oldPrice}
                priceIqd={product.oldPriceIqd}
              />
            </span>
          )}
        </span>
        {product.colors?.length > 0 && (
          // One square swatch and a count, rather than a row of dots. A card
          // showing five circles spends more of the eye's attention on colour
          // chips than on the product; the count says the same thing in less
          // space, and the full set is on the product page where it can be
          // chosen. Colours arrive resolved from lib/products/colors — the
          // swatch is painted inline because the stored names are Arabic, so
          // there is no utility class to reach for.
          <ul className="list-color-product">
            {(() => {
              const [first, ...rest] = product.colors;
              const label = locale === "en" ? first.nameEn : first.nameAr;
              return (
                <>
                  <li
                    key={first.key ?? "first"}
                    className={`list-color-item color-swatch ${
                      currentImage == first.imgSrc ? "active" : ""
                    } ${first.isLight ? "line" : ""}`}
                    onMouseOver={() =>
                      first.imgSrc && setCurrentImage(first.imgSrc)
                    }
                    title={label}
                  >
                    <span
                      className="swatch-value"
                      style={{ backgroundColor: first.hex }}
                      aria-label={label}
                    />
                  </li>
                  {rest.length > 0 && (
                    <li
                      className="list-color-item card-swatch-more"
                      // The remaining colours are named for screen readers; the
                      // "+2" alone would tell them nothing.
                      title={rest
                        .map((c) => (locale === "en" ? c.nameEn : c.nameAr))
                        .join("، ")}
                    >
                      +{rest.length}
                    </li>
                  )}
                </>
              );
            })()}
          </ul>
        )}
      </div>
    </div>
  );
}
