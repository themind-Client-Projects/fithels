"use client";

import React, { useCallback, useRef, useState } from "react";
import ProductCard1 from "@/components/productCards/ProductCard1";

/**
 * The horizontal rail under "you may also like", with a scroll indicator.
 *
 * A thin client shell around cards the server already built — the products are
 * passed in as data, so nothing about the query or the card markup moves to the
 * browser. All this adds is the scroll position.
 *
 * The indicator is a proportional bar rather than dots. Ten items at two-and-a-
 * bit visible would need ten dots to mean anything, which is more chrome than
 * the row itself; a bar whose thumb is as wide as the visible fraction answers
 * both questions at once — how far along, and how much is left.
 *
 * RTL: a right-to-left scroller reports scrollLeft as 0 at the RIGHT edge and
 * counts negative going left. Taking the absolute value makes "distance
 * travelled" mean the same thing in both directions, and the thumb is positioned
 * with a logical offset so it starts on the correct side.
 */
export default function RelatedRail({ cards }) {
  const railRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [visibleFraction, setVisibleFraction] = useState(1);

  const measure = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;

    const { scrollWidth, clientWidth, scrollLeft } = rail;
    const overflow = scrollWidth - clientWidth;

    setVisibleFraction(scrollWidth > 0 ? clientWidth / scrollWidth : 1);
    // Guard the divide: a rail short enough not to scroll has no progress to
    // report, and would otherwise divide by zero.
    setProgress(overflow > 0 ? Math.min(1, Math.abs(scrollLeft) / overflow) : 0);
  }, []);

  // Nothing to indicate when everything already fits.
  const showIndicator = visibleFraction < 0.999;

  return (
    <>
      <div className="related-products__rail" ref={railRef} onScroll={measure}>
        {cards.map((card) => (
          <ProductCard1 key={card.dbId} product={card} />
        ))}
      </div>

      <div
        className={`rail-progress${showIndicator ? "" : " rail-progress--idle"}`}
        aria-hidden="true"
      >
        <span
          className="rail-progress__thumb"
          style={{
            // Width is the share of the row on screen; the offset walks it
            // across whatever space is left over.
            inlineSize: `${Math.max(visibleFraction, 0.12) * 100}%`,
            insetInlineStart: `${progress * (1 - Math.max(visibleFraction, 0.12)) * 100}%`,
          }}
        />
      </div>
    </>
  );
}
