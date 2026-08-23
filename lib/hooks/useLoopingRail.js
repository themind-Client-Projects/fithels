"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Makes a scroll-snap rail wrap around at both ends.
 *
 * The caller renders a clone of the LAST item before the first, and a clone of
 * the FIRST item after the last:
 *
 *     [ cloneOfLast | 1 | 2 | … | N | cloneOfFirst ]
 *
 * Swiping past the end lands on cloneOfFirst — which looks exactly like item 1 —
 * and once scrolling settles this jumps to the real item 1 with animation off.
 * The shopper sees a continuous loop; the browser only ever does a plain scroll.
 *
 * POSITIONS ARE MEASURED, NOT CALCULATED.
 *
 * The first version multiplied a slide width by an index. That failed twice
 * over: the width is 0 before the children have been laid out, so the opening
 * jump to the first real item was skipped and the rail was left sitting on the
 * clone of the LAST item — a three-image gallery opened on image 3 and appeared
 * to skip image 2 — and the arithmetic needed a sign flip for RTL that had to be
 * right in three separate places.
 *
 * Comparing bounding rectangles and moving by a relative delta avoids both. The
 * delta is a physical distance, so `scrollBy` interprets it identically whether
 * the rail runs left-to-right or right-to-left, and there is no width to be zero.
 */
export function useLoopingRail(count) {
  const railRef = useRef(null);
  const settleTimer = useRef(null);
  const [index, setIndex] = useState(0);

  const isRtl = (rail) => getComputedStyle(rail).direction === "rtl";

  /** The edge a slide snaps to: the right edge in RTL, the left edge in LTR. */
  const startEdge = (rect, rtl) => (rtl ? rect.right : rect.left);

  /** Which slot is currently parked at the rail's start edge. */
  const currentSlot = useCallback(() => {
    const rail = railRef.current;
    if (!rail || rail.children.length === 0) return 0;

    const rtl = isRtl(rail);
    const railStart = startEdge(rail.getBoundingClientRect(), rtl);

    let best = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < rail.children.length; i += 1) {
      const distance = Math.abs(
        startEdge(rail.children[i].getBoundingClientRect(), rtl) - railStart
      );
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    }
    return best;
  }, []);

  /**
   * Bring a slot to the rail's start edge.
   *
   * Returns the distance it had to travel, so the opening positioning can tell
   * whether layout was ready or whether it needs another frame.
   */
  const scrollToSlot = useCallback((slot, smooth) => {
    const rail = railRef.current;
    const child = rail?.children[slot];
    if (!rail || !child) return 0;

    const rtl = isRtl(rail);
    const delta =
      startEdge(child.getBoundingClientRect(), rtl) -
      startEdge(rail.getBoundingClientRect(), rtl);

    if (delta === 0) return 0;

    const previous = rail.style.scrollBehavior;
    if (!smooth) rail.style.scrollBehavior = "auto";
    rail.scrollBy({ left: delta, behavior: smooth ? "smooth" : "auto" });
    if (!smooth) {
      // Restored next frame: setting it back synchronously can land before the
      // scroll is applied, and the correction animates after all.
      requestAnimationFrame(() => {
        rail.style.scrollBehavior = previous;
      });
    }
    return delta;
  }, []);

  /** Which real item a slot shows, clones folded back in. */
  const realIndex = useCallback(
    (slot) => {
      if (slot <= 0) return count - 1;
      if (slot >= count + 1) return 0;
      return slot - 1;
    },
    [count]
  );

  const handleScroll = useCallback(() => {
    if (count === 0) return;

    const slot = currentSlot();
    setIndex(realIndex(slot));

    clearTimeout(settleTimer.current);
    // Only correct once scrolling has STOPPED. Repositioning mid-gesture cancels
    // iOS momentum and pulls the rail out from under a finger.
    settleTimer.current = setTimeout(() => {
      if (slot <= 0) scrollToSlot(count, false);
      else if (slot >= count + 1) scrollToSlot(1, false);
    }, 140);
  }, [count, currentSlot, realIndex, scrollToSlot]);

  /** Jump to a real item, 0-based — used by the dots. */
  const goTo = useCallback(
    (target) => scrollToSlot(target + 1, true),
    [scrollToSlot]
  );

  /**
   * Park the rail on the first REAL item.
   *
   * Retried across a few frames because the children may have no width on the
   * first one — images inside them have not been laid out yet — and a rail left
   * un-positioned opens on the clone of the last item, which is precisely the
   * bug this replaced. It stops as soon as a move actually happens, or after a
   * handful of frames so a genuinely zero-width rail cannot spin.
   */
  useEffect(() => {
    if (count === 0 || !railRef.current) return undefined;

    let frame;
    let attempts = 0;

    const settle = () => {
      attempts += 1;
      const moved = scrollToSlot(1, false);
      // A zero delta means either "already correct" or "nothing laid out yet";
      // the slot check tells the two apart.
      if (moved !== 0 || currentSlot() === 1 || attempts > 10) return;
      frame = requestAnimationFrame(settle);
    };

    frame = requestAnimationFrame(settle);
    return () => cancelAnimationFrame(frame);
  }, [count, scrollToSlot, currentSlot]);

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  const attach = useCallback((node) => {
    railRef.current = node;
  }, []);

  return { attach, handleScroll, index, goTo };
}
