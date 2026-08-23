"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

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
 * POSITIONS ARE MEASURED, NOT CALCULATED. Comparing bounding rectangles and
 * moving by a relative delta means there is no width that can be zero and no
 * sign to flip for RTL — `scrollBy` reads a physical distance identically in
 * both directions, where arithmetic on scrollLeft needs the flip correct in
 * three separate places.
 *
 * THE OPENING POSITION IS SET BEFORE PAINT.
 *
 * It used to be set from a `requestAnimationFrame` inside `useEffect`, and that
 * is the bug this replaced: rAF does not run in a background or hidden tab, so
 * the rail stayed where the browser left it — slot 0, the clone of the LAST
 * item. The gallery then showed the last photo while the dots said "1", and the
 * first scroll fired the `slot <= 0` correction, which threw the shopper to the
 * real last item. That is precisely "I went to the first item and it put me back
 * on the last".
 *
 * A layout effect runs synchronously after the DOM is in place and before the
 * browser paints, and reading a bounding rect there forces the layout it needs,
 * so the measurement is available without waiting for a frame. A ResizeObserver
 * covers the one case a layout effect cannot: a rail that genuinely has no width
 * at mount because an ancestor is still hidden.
 */

/* A layout effect on the client, a plain one on the server — useLayoutEffect
   warns during SSR, and there is nothing to position there anyway. */
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function useLoopingRail(count, clones = 1) {
  const railRef = useRef(null);
  const settleTimer = useRef(null);
  const smoothTimer = useRef(null);
  const verifyTimer = useRef(null);
  const anchored = useRef(false);
  const [index, setIndex] = useState(0);

  const isRtl = (rail) => getComputedStyle(rail).direction === "rtl";

  /** The edge a slide snaps to: the right edge in RTL, the left edge in LTR. */
  const startEdge = (rect, rtl) => (rtl ? rect.right : rect.left);

  /**
   * Whether the rail actually holds clones.
   *
   * The callers only attach this hook when there are enough items to loop, but
   * checking the invariant here means a caller that forgets cannot produce a
   * rail that silently opens on the second item and corrects to nonsense.
   */
  const isLooped = useCallback(
    (rail) => count > 0 && rail.children.length === count + 2 * clones,
    [count, clones]
  );

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
   * Bring a slot to the rail's start edge. Returns the distance travelled.
   *
   * SNAPPING IS SUSPENDED FOR THE MOVE, and that is the whole point of this
   * function rather than a bare scrollBy.
   *
   * The slides carry `scroll-snap-stop: always`, which tells the browser a
   * scroll may not skip past a snap point — it is what stops a flick from
   * flying through four photos at once. It applies to programmatic scrolls too,
   * so the wrap correction, which deliberately travels the whole rail at once,
   * was being halted at the very first slide it met. Landing on the clone of
   * the first item and correcting back to the real one therefore stopped on the
   * LAST item instead, and the shopper bounced between the first and the last
   * with the middle unreachable.
   *
   * Turning snapping off for the duration lets the jump land where it was
   * aimed; restoring it re-snaps, and since the rail is sitting exactly on a
   * snap point by then, nothing moves.
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

    const previousSnap = rail.style.scrollSnapType;
    const previousBehavior = rail.style.scrollBehavior;
    rail.style.scrollSnapType = "none";
    // "instant" rather than "auto": auto defers to the CSS scroll-behavior,
    // which would animate the correction and make it visible.
    if (!smooth) rail.style.scrollBehavior = "auto";
    rail.scrollBy({ left: delta, behavior: smooth ? "smooth" : "instant" });

    if (smooth) {
      // A smooth scroll is still running, so snapping has to stay off until it
      // finishes or it will arrest the animation the same way. scrollend is the
      // precise signal; the timeout is the fallback where it is unsupported.
      const restore = () => {
        rail.style.scrollSnapType = previousSnap;
        rail.removeEventListener("scrollend", restore);
        clearTimeout(smoothTimer.current);
      };
      rail.addEventListener("scrollend", restore);
      clearTimeout(smoothTimer.current);
      smoothTimer.current = setTimeout(restore, 700);
    } else {
      rail.style.scrollSnapType = previousSnap;
      rail.style.scrollBehavior = previousBehavior;
    }
    return delta;
  }, []);

  /** Which real item a slot shows, clones folded back in. */
  const realIndex = useCallback(
    (slot) => {
      if (slot < clones) return count - clones + slot;
      if (slot >= clones + count) return slot - clones - count;
      return slot - clones;
    },
    [count, clones]
  );

  const handleScroll = useCallback(() => {
    const rail = railRef.current;
    if (!rail || !isLooped(rail)) return;

    setIndex(realIndex(currentSlot()));

    clearTimeout(settleTimer.current);
    // Only correct once scrolling has STOPPED. Repositioning mid-gesture cancels
    // iOS momentum and pulls the rail out from under a finger.
    settleTimer.current = setTimeout(() => {
      // Re-measured rather than closed over. The slot at the moment the timer
      // was scheduled is not necessarily where the rail came to rest, and
      // correcting from a stale reading jumps to the wrong end of the loop.
      const settled = currentSlot();
      // Shifted by exactly one full set rather than snapped to a fixed slot, so
      // the shopper keeps the position they scrolled to instead of being pulled
      // back to the very first card.
      if (settled < clones) scrollToSlot(settled + count, false);
      else if (settled >= clones + count) scrollToSlot(settled - count, false);
    }, 140);
  }, [count, clones, currentSlot, realIndex, scrollToSlot, isLooped]);

  /**
   * Jump to a real item, 0-based — used by the dots.
   *
   * The landing is verified rather than assumed. A smooth scroll can be cut
   * short by the slides' `scroll-snap-stop`, and a backgrounded tab does not
   * animate at all, so `scrollBy` there is a no-op. Either way a dot that
   * silently does nothing is worse than one that jumps, so if the rail is not
   * on the requested slide once the animation should have finished, it is put
   * there outright.
   */
  const goTo = useCallback(
    (target) => {
      const slot = target + clones;
      scrollToSlot(slot, true);
      clearTimeout(verifyTimer.current);
      verifyTimer.current = setTimeout(() => {
        if (currentSlot() !== slot) scrollToSlot(slot, false);
      }, 800);
    },
    [scrollToSlot, currentSlot, clones]
  );

  /** Park the rail on the first REAL item. Returns whether it succeeded. */
  const anchor = useCallback(() => {
    const rail = railRef.current;
    // A rail an ancestor is still hiding has no width to measure against; the
    // ResizeObserver below picks it up the moment it gets one.
    if (!rail || !isLooped(rail) || rail.clientWidth === 0) return false;
    scrollToSlot(clones, false);
    return currentSlot() === clones;
  }, [isLooped, scrollToSlot, currentSlot, clones]);

  useIsomorphicLayoutEffect(() => {
    anchored.current = anchor();
    if (anchored.current) return undefined;

    const rail = railRef.current;
    if (!rail || typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(() => {
      if (anchored.current) return;
      anchored.current = anchor();
    });
    observer.observe(rail);
    return () => observer.disconnect();
  }, [anchor]);

  useEffect(
    () => () => {
      clearTimeout(settleTimer.current);
      clearTimeout(smoothTimer.current);
      clearTimeout(verifyTimer.current);
    },
    []
  );

  const attach = useCallback((node) => {
    railRef.current = node;
  }, []);

  return { attach, handleScroll, index, goTo };
}
