"use client";

import React from "react";
import ProductCard1 from "@/components/productCards/ProductCard1";
import { useLoopingRail } from "@/lib/hooks/useLoopingRail";

/**
 * The horizontal rail under "you may also like".
 *
 * A thin client shell around cards the server already built — the products are
 * passed in as data, so neither the query nor the card markup moves to the
 * browser. All this adds is scroll behaviour.
 *
 * The rail wraps: swiping past the last card continues into the first rather
 * than hitting a wall. useLoopingRail explains how; here the only requirement is
 * rendering the two clones it needs, marked aria-hidden so a screen reader is
 * not read the same product three times.
 *
 * The indicator is a proportional bar rather than dots. Ten items with two and a
 * bit on screen would need ten dots to mean anything, which is more chrome than
 * the row itself, and dots still would not say how much is left.
 */
export default function RelatedRail({ cards }) {
  const { attach, handleScroll, index } = useLoopingRail(cards.length);

  if (cards.length === 0) return null;

  // Below three cards there is nothing to loop through — the clones would be
  // most of the rail, and every position would show the same products twice.
  const loop = cards.length >= 3;
  const slides = loop
    ? [
        { card: cards[cards.length - 1], clone: true },
        ...cards.map((card) => ({ card, clone: false })),
        { card: cards[0], clone: true },
      ]
    : cards.map((card) => ({ card, clone: false }));

  const progress = cards.length > 1 ? index / (cards.length - 1) : 0;
  const thumbWidth = Math.max(1 / cards.length, 0.12);

  return (
    <>
      <div
        className="related-products__rail"
        ref={loop ? attach : undefined}
        onScroll={loop ? handleScroll : undefined}
      >
        {slides.map(({ card, clone }, i) => (
          <div
            className="related-products__slide"
            key={clone ? `clone-${i}` : card.dbId}
            aria-hidden={clone || undefined}
          >
            <ProductCard1 product={card} />
          </div>
        ))}
      </div>

      {cards.length > 1 && (
        <div className="rail-progress" aria-hidden="true">
          <span
            className="rail-progress__thumb"
            style={{
              inlineSize: `${thumbWidth * 100}%`,
              insetInlineStart: `${progress * (1 - thumbWidth) * 100}%`,
            }}
          />
        </div>
      )}
    </>
  );
}
