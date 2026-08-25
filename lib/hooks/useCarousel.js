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
/**
 * What counts as wanting the next item.
 *
 * A carousel that only advances once the item has been dragged more than
 * halfway is exhausting to use, and no real app behaves that way — a short
 * decisive swipe is meant to be enough. So the release is judged on INTENT,
 * either of which is sufficient:
 *
 *   - the item was pushed a fifth of the way across, or
 *   - it was let go while still moving at a flick's pace.
 *
 * An earlier version worked the other way round, adding a momentum term to the
 * distance and rounding: at a normal swiping speed that term came to about a
 * tenth of an item, so a shopper still had to drag well over a third of the
 * width before anything happened.
 */
/** Fraction of an item that counts as a deliberate push. */
const NUDGE = 0.2;
/** Pixels per millisecond that count as a flick — 250px/s. */
const FLICK = 0.25;
/** Movement beyond this many pixels is a drag, not a tap. */
const SLOP = 6;
/** Shortest window used to measure speed, so a fast sample cannot blow up. */
const SAMPLE_MS = 8;

export function useCarousel(count, { loop = true, gap = 0 } = {}) {
  const viewportRef = useRef(null);
  const slidesRef = useRef([]);
  const position = useRef(0);
  const frame = useRef(0);
  const drag = useRef(null);
  /** Whether the LAST gesture was a drag. Outlives `drag`, which endDrag clears. */
  const dragged = useRef(false);
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
    const frameWidth = viewport.clientWidth;

    slidesRef.current.forEach((node, i) => {
      if (!node) return;
      const delta = nearestDelta(i, position.current, count, loop);
      // Distance from the frame's leading edge, before the direction is
      // applied — so the visibility test below reads the same either way round.
      const offset = delta * travel;

      node.style.transform = `translate3d(${offset * direction}px, 0, 0)`;

      // Kept if any PART of the item could fall inside the frame, plus one
      // item of margin each side so the next one is painted before it slides
      // in. This has to be measured, not a fixed number of items: the gallery
      // shows one slide at a time but this rail shows two and a half, and a
      // fixed cut-off of one and a half items hid the partial third card —
      // the very thing that tells the shopper the row keeps going.
      const width = node.offsetWidth;
      node.style.visibility =
        offset + width > -travel && offset < frameWidth + travel
          ? "visible"
          : // Hidden rather than merely off-screen, so a screen reader is not
            // read products nobody can see and a keyboard cannot tab into them.
            "hidden";
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
    dragged.current = false;
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
        dragged.current = true;
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
      // Pixels per millisecond, sampled over the most recent stretch rather
      // than the whole gesture, so a flick at the end of a slow drag still
      // reads as a flick. Samples closer together than SAMPLE_MS are skipped:
      // pointer events can arrive within the same millisecond, and dividing by
      // that gives a speed of hundreds of items per second.
      const now = performance.now();
      const elapsed = now - state.at;
      if (elapsed >= SAMPLE_MS) {
        state.velocity = (event.clientX - state.lastX) / elapsed;
        state.lastX = event.clientX;
        state.at = now;
      }

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

      // How far the gesture actually carried, in items.
      const moved = position.current - state.from;
      const distance = Math.abs(moved);
      const speed = Math.abs(state.velocity);

      // Which way to go. Normally the sign of the travel; for a flick that
      // barely moved, the sign of the speed — dragging towards the start of the
      // line advances, which is why the reading is inverted here.
      const heading =
        distance > 0.01
          ? Math.sign(moved)
          : -Math.sign(state.velocity * direction);

      // Whole items covered, and then the intent test for anything short of
      // one: a fifth of the way across, or still moving at a flick's pace.
      let steps = Math.round(distance);
      if (steps === 0 && (speed >= FLICK || distance >= NUDGE)) steps = 1;

      // Measured from where the drag STARTED, so a gesture can only ever move
      // as many items as it covered — never one further because the position
      // it began from happened to be mid-animation.
      goTo(Math.round(state.from) + heading * steps);
    },
    [goTo]
  );

  /**
   * Swallow the click a drag ends on.
   *
   * The rail's slides are links to products. Without this, swiping the row
   * opens whichever product the finger happened to lift over — the browser
   * still fires a click after the gesture, and it cannot tell a swipe from a
   * tap. A tap is left alone, so the cards are still links.
   *
   * `dragged` is a separate ref rather than a read of `drag.current`, which
   * endDrag has already cleared by the time the click arrives. Capture phase,
   * so the link never sees the event at all.
   */
  const suppressClick = useCallback((event) => {
    if (!dragged.current) return;
    dragged.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

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
    // Part of the handler set on purpose: a caller whose slides are links would
    // otherwise have to know to add this, and forgetting it means swiping the
    // row opens a product.
    onClickCapture: suppressClick,
  };

  return {
    index,
    attachViewport,
    registerSlide,
    dragHandlers,
    goTo,
    next,
    previous,
  };
}
