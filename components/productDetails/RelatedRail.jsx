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
/**
 * How many items to clone at each end.
 *
 * ONE IS NOT ENOUGH HERE, and that was the bug. A rail only wraps once the
 * shopper can actually scroll the far clone to the leading edge, and this rail
 * shows two and a half cards at a time — the single trailing clone needed more
 * scroll than the rail had, so the wrap point was physically unreachable and
 * the row simply stopped dead at the last card. The gallery never had the
 * problem because its slides are the full width, where one clone is exactly a
 * viewport.
 *
 * Six covers the widest layout the rail has: cards are 19% at 1200px and up, so
 * five and a bit are on screen at once. Capped at the number of real cards,
 * since cloning more than exist would repeat them within one screen.
 */
const CLONES = 6;

export default function RelatedRail({ cards }) {
  // Fewer than four cards barely overflows the rail, so there is nothing to
  // loop through and the clones would be most of what is rendered.
  const loop = cards.length >= 4;
  const clones = loop ? Math.min(cards.length, CLONES) : 0;
  const { attach, handleScroll, index } = useLoopingRail(cards.length, clones);

  if (cards.length === 0) return null;

  const slides = loop
    ? [
        ...cards.slice(cards.length - clones).map((card) => ({
          card,
          clone: true,
        })),
        ...cards.map((card) => ({ card, clone: false })),
        ...cards.slice(0, clones).map((card) => ({ card, clone: true })),
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
