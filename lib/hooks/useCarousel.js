"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

/**
 * An infinite carousel, positioned rather than scrolled.
 *
 * WHY NOT A SCROLL CONTAINER WITH CLONES.
 *
 * The previous approach duplicated items at both ends and, once scrolling
 * stopped, silently shifted the scroll position back by one full set. Every
 * part of that fought the browser: `scroll-snap-stop` arrested the correction
 * so the wrap landed on the wrong item, the opening position had to be forced
 * before paint or the rail showed a clone of the LAST item, `scrollLeft` runs
 * backwards in Arabic, and each fix needed another guard. Wrapping was an event
 * to detect and repair, and repairs can be late, blocked, or wrong.
 *
 * HOW THIS WORKS INSTEAD.
 *
 * There is one number: `position`, an unbounded float saying where the carousel
 * is. Item `i` is drawn `nearestDelta(i, position)` steps from the leading edge
 * — the distance to whichever COPY of item `i` is closest. Item 0 sitting five
 * places behind is drawn as if it were one place ahead, because on a loop it
 * is.
 *
 * Wrapping therefore never happens. There is nothing to detect and nothing to
 * correct: the arithmetic already places every item on its near side, so the
 * carousel is seamless by construction rather than by repair. No clones, no
 * settle timers, no scroll position to restore, no snapping to defeat.
 *
 * Moving to an item animates to `position + nearestDelta(target, position)` —
 * the nearest equivalent — so item 10 to item 1 travels one step forwards, not
 * nine steps back.
 */

/**
 * Distance from `position` to `index`, folded onto the nearest copy.
 *
 * Returns a value in [-count/2, count/2): the shortest way round the loop.
 */
export function nearestDelta(index, position, count, loop) {
  const raw = index - position;
  if (!loop || count < 2) return raw;
  const half = count / 2;
  const folded = (((raw + half) % count) + count) % count;
  return folded - half;
}

/** Ease-out cubic: quick to leave, gentle to arrive. */
const ease = (t) => 1 - (1 - t) ** 3;

const DURATION = 420;
/** How long a flick keeps coasting after release, in milliseconds. */
const THROW_MS = 90;
/** The most a flick may contribute, in items. Under half, deliberately. */
const MAX_COAST = 0.45;
/** Movement beyond this is a drag, not a tap. */
const SLOP = 6;

export function useCarousel(count, { loop = true, gap = 0 } = {}) {
  const viewportRef = useRef(null);
  const slidesRef = useRef([]);
  const position = useRef(0);
  const frame = useRef(0);
  const drag = useRef(null);
  const [index, setIndex] = useState(0);

  /** One item's worth of travel, in pixels. */
  const step = useCallback(() => {
    const slide = slidesRef.current[0];
    return (slide?.offsetWidth ?? viewportRef.current?.clientWidth ?? 0) + gap;
  }, [gap]);

  /**
   * Write every slide's transform for the current position.
   *
   * Written straight to the DOM rather than through state: this runs on every
   * animation frame and every pointer move, and re-rendering the whole
   * carousel that often to change one transform would be wasteful. React still
   * owns `index`, which changes only when the carousel settles on a new item.
   */
  const paint = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    // Arabic runs the other way. Reading it here rather than taking it as a
    // prop means a caller cannot forget, and it follows the document if the
    // shopper switches language.
    const direction =
      getComputedStyle(viewport).direction === "rtl" ? -1 : 1;
    const travel = step();

    slidesRef.current.forEach((node, i) => {
      if (!node) return;
      const delta = nearestDelta(i, position.current, count, loop);
      node.style.transform = `translate3d(${delta * travel * direction}px, 0, 0)`;
      // Far-off items are inert: hidden keeps them out of the tab order and off
      // the accessibility tree, so a screen reader is not read every product
      // three times and a keyboard cannot tab into a card nobody can see.
      node.style.visibility = Math.abs(delta) < 1.5 ? "visible" : "hidden";
    });
  }, [count, loop, step]);

  const animateTo = useCallback(
    (target) => {
      cancelAnimationFrame(frame.current);

      const from = position.current;
      const distance = target - from;
      const reduced = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      // Jump rather than animate when there is nothing to see: already there,
      // the shopper asked for less motion, or the tab is in the background.
      // A backgrounded tab is not merely a wasted animation — it delivers no
      // animation frames at all, so the tween would stall part-way and leave
      // the carousel stopped between two photos.
      if (Math.abs(distance) < 0.001 || reduced || document.hidden) {
        position.current = target;
        paint();
        return;
      }

      const started = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - started) / DURATION);
        position.current = from + distance * ease(t);
        paint();
        if (t < 1) frame.current = requestAnimationFrame(tick);
      };
      frame.current = requestAnimationFrame(tick);
    },
    [paint]
  );

  /** Go to an item. Accepts out-of-range values and wraps them. */
  const goTo = useCallback(
    (target) => {
      if (count === 0) return;
      const settled = loop
        ? ((target % count) + count) % count
        : Math.min(Math.max(target, 0), count - 1);
      setIndex(settled);
      // The nearest equivalent, which is what makes last -> first travel one
      // step forwards instead of winding all the way back.
      animateTo(
        loop
          ? position.current +
              nearestDelta(settled, position.current, count, true)
          : settled
      );
    },
    [count, loop, animateTo]
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const previous = useCallback(() => goTo(index - 1), [goTo, index]);

  /* ── Dragging ──────────────────────────────────────────────────────────── */

  const onPointerDown = useCallback((event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    cancelAnimationFrame(frame.current);
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      lastX: event.clientX,
      from: position.current,
      at: performance.now(),
      velocity: 0,
      moved: false,
      // Until the gesture is clearly horizontal it may still be the shopper
      // scrolling the page, and stealing it would lock the page up.
      claimed: false,
    };
  }, []);

  const onPointerMove = useCallback(
    (event) => {
      const state = drag.current;
      if (!state || state.id !== event.pointerId) return;

      const dx = event.clientX - state.x;
      const dy = event.clientY - state.y;

      if (!state.claimed) {
        if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          drag.current = null; // a vertical scroll — let the page have it
          return;
        }
        state.claimed = true;
        state.moved = true;
        // Capture keeps the gesture alive if the finger leaves the frame. It
        // throws for a pointer the element never saw, which must not take the
        // whole drag down with it.
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          /* uncaptured drags still track, they just stop at the frame edge */
        }
      }

      const direction =
        getComputedStyle(event.currentTarget).direction === "rtl" ? -1 : 1;
      const travel = step() || 1;
      // Pixels per millisecond, from the last move rather than the whole
      // gesture, so a flick at the end of a slow drag still counts as a flick.
      const now = performance.now();
      const elapsed = now - state.at;
      if (elapsed > 0) {
        state.velocity = (event.clientX - state.lastX) / elapsed;
      }
      state.lastX = event.clientX;
      state.at = now;

      let target = state.from - (dx / travel) * direction;
      if (!loop) {
        // Resist past the ends rather than stopping dead, so the edge is felt.
        if (target < 0) target *= 0.35;
        else if (target > count - 1) target = count - 1 + (target - (count - 1)) * 0.35;
      }
      position.current = target;
      paint();
    },
    [count, loop, paint, step]
  );

  const endDrag = useCallback(
    (event) => {
      const state = drag.current;
      if (!state || state.id !== event.pointerId) return;
      drag.current = null;

      if (!state.claimed) return;

      const direction =
        getComputedStyle(event.currentTarget).direction === "rtl" ? -1 : 1;
      const travel = step() || 1;
      // A flick carries past where the finger let go, in proportion to how fast
      // it was moving — a slow drag settles where it is left. Velocity is
      // px/ms, so dividing by the item width turns it into items/ms.
      //
      // Capped below HALF an item, which is what keeps a flick honest: it can
      // only tip which side of the rounding the carousel lands on, never add a
      // step of its own. Uncapped, a sharp flick reports a very high velocity
      // and would carry the shopper two photos past the one they reached for.
      const coast = Math.max(
        -MAX_COAST,
        Math.min(MAX_COAST, ((state.velocity * direction) / travel) * THROW_MS)
      );
      goTo(Math.round(position.current - coast));
    },
    [goTo, step]
  );

  /** True while a drag is in progress — for suppressing the click it ends on. */
  const wasDragged = useCallback(() => Boolean(drag.current?.moved), []);

  /* ── Wiring ────────────────────────────────────────────────────────────── */

  const registerSlide = useCallback(
    (i) => (node) => {
      slidesRef.current[i] = node;
    },
    []
  );

  const attachViewport = useCallback((node) => {
    viewportRef.current = node;
  }, []);

  /**
   * Keep the slides positioned.
   *
   * The transforms are in pixels, so any width change makes every one of them
   * stale — and a carousel that measured zero on its first pass would leave the
   * whole set stacked on top of each other. Three signals, because no single
   * one covers every case: the layout effect runs before each paint, the
   * observer catches a frame that changes size without a re-render, and the
   * window listener is the fallback for the observer being throttled — a
   * backgrounded tab delivers neither frames nor observations.
   *
   * A layout effect rather than an effect, so the slides are never painted in
   * the wrong place first. Deliberately no dependency array: it runs after
   * every render, and positioning a handful of elements is far cheaper than
   * reasoning about when it should be skipped.
   */
  useLayoutEffect(paint);

  useEffect(() => {
    const viewport = viewportRef.current;
    window.addEventListener("resize", paint);
    const observer =
      typeof ResizeObserver === "undefined" || !viewport
        ? null
        : new ResizeObserver(paint);
    observer?.observe(viewport);
    return () => {
      window.removeEventListener("resize", paint);
      observer?.disconnect();
    };
  }, [paint]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const dragHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  };

  return {
    index,
    attachViewport,
    registerSlide,
    dragHandlers,
    wasDragged,
    goTo,
    next,
    previous,
  };
}
