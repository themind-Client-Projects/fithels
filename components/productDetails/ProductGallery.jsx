"use client";

import React from "react";
import Image from "next/image";
import { useCarousel } from "@/lib/hooks/useCarousel";

/**
 * The product photo carousel.
 *
 * Lifted out of the product page so it can be REMOUNTED when the shopper
 * changes colour. The carousel keeps its position in a ref — the whole point of
 * useCarousel is that the position is one unbounded number written straight to
 * the DOM — and swapping the photos underneath it would leave that number
 * pointing at a slide the new colour does not have: pick a colour with two
 * photos while sitting on the fourth of another, and the frame shows nothing.
 *
 * The caller gives it `key={colour}`, so React discards the old carousel and
 * builds a new one. That is also the behaviour you want anyway — changing
 * colour should show the first photo of that colour, not the fourth.
 *
 * Every image stays in the document, so crawlers still see the whole set.
 *
 * It wraps: swiping past the last photo continues into the first. useCarousel
 * explains how — in short, there are no duplicated slides, each photo is drawn
 * at whichever copy of itself is nearest, so there is no wrap to detect and
 * nothing to correct after the fact.
 */
export default function ProductGallery({ images, title }) {
  // A single photo has nothing to move between; two would show the same picture
  // on both sides of the loop.
  const loop = images.length >= 3;
  const {
    index: activeIndex,
    attachViewport,
    registerSlide,
    dragHandlers,
    goTo,
  } = useCarousel(images.length, { loop });

  if (images.length === 0) {
    return (
      <div
        style={{ width: "100%", paddingBottom: "133%", background: "#f8f9fa" }}
      />
    );
  }

  return (
    <>
      <div ref={attachViewport} className="pdp-gallery" {...dragHandlers}>
        {images.map((img, i) => (
          <div
            className="pdp-gallery__slide"
            key={img + i}
            ref={registerSlide(i)}
          >
            <Image
              src={img}
              alt={`${title} — ${i + 1}`}
              width={900}
              height={1200}
              // No clones any more, so the first real slide — the LCP
              // candidate — is simply the first one.
              priority={i === 0}
              sizes="(max-width: 767px) 100vw, 50vw"
              // A drag that starts on a photo must move the carousel, not tear
              // the image out of the page.
              draggable={false}
              className="pdp-gallery__img"
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <div className="pdp-dots" role="tablist" aria-label={title}>
          {images.map((img, i) => (
            <button
              key={img + i}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`${i + 1} / ${images.length}`}
              onClick={() => goTo(i)}
              className={`pdp-dot${i === activeIndex ? " is-active" : ""}`}
            />
          ))}
        </div>
      )}
    </>
  );
}
