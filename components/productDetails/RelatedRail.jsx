"use client";

import React from "react";
import ProductCard1 from "@/components/productCards/ProductCard1";
import { useCarousel } from "@/lib/hooks/useCarousel";

/** Gap between cards, in pixels. Must match `--related-gap` in globals.css. */
const GAP = 2;

/**
 * The horizontal rail under "you may also like".
 *
 * A thin client shell around cards the server already built — the products are
 * passed in as data, so neither the query nor the card markup moves to the
 * browser. All this adds is the dragging.
 *
 * The rail wraps: dragging past the last card continues into the first rather
 * than hitting a wall.
 *
 * THE CLONES ARE GONE. This used to duplicate six cards at each end so that
 * scrolling off one end landed on a copy of the other, and six was not a
 * decision so much as a measurement — enough to cover the widest viewport,
 * because with fewer the wrap point sat beyond the end of the scroll range and
 * could not be reached at all, so the row just stopped dead. Twenty-two cards
 * were rendered to show ten. useCarousel draws each card at whichever copy of
 * itself is nearest instead, so ten cards are ten cards and the wrap is
 * arithmetic rather than a scroll position to repair.
 *
 * The indicator is a proportional bar rather than dots. Ten items with two and a
 * bit on screen would need ten dots to mean anything, which is more chrome than
 * the row itself, and dots still would not say how much is left.
 */
export default function RelatedRail({ cards }) {
  // Fewer than four cards do not fill the rail, so there is nothing to loop
  // through and a wrap would just show the same products twice on one screen.
  const loop = cards.length >= 4;
  const { index, attachViewport, registerSlide, dragHandlers } = useCarousel(
    cards.length,
    { loop, gap: GAP }
  );

  if (cards.length === 0) return null;

  const progress = cards.length > 1 ? index / (cards.length - 1) : 0;
  const thumbWidth = Math.max(1 / cards.length, 0.12);

  return (
    <>
      <div
        className="related-products__rail"
        ref={attachViewport}
        {...dragHandlers}
      >
        {cards.map((card, i) => (
          <div
            className="related-products__slide"
            key={card.dbId}
            ref={registerSlide(i)}
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
