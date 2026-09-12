"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import Image from "next/image";

/**
 * A banner's picture, with an optional video laid over it.
 *
 * THE IMAGE ALWAYS RENDERS. It is not a fallback that swaps in — it is
 * underneath the whole time, and the video is painted on top of it. Three
 * things follow from that, all of which the obvious "video OR image" version
 * gets wrong:
 *
 *   - The layout never depends on the video. The hero takes its height from
 *     this image; a `fill` video contributes no height at all, so swapping one
 *     for the other collapsed the slide to nothing.
 *   - There is no poster to arrange. What shows before the first frame is the
 *     real image, already decoded, at the size the optimiser served it.
 *   - Failure is free. A codec the browser will not decode just leaves the
 *     picture showing, because the picture was never removed.
 *
 * THREE ATTRIBUTES AUTOPLAY NEEDS, and it silently does nothing without all of
 * them: `muted` (every browser blocks autoplay with sound — this is not a
 * preference, an unmuted video simply never starts), `playsInline` (without it
 * iOS Safari goes fullscreen the moment it plays, hijacking the page for a
 * decorative loop), and `loop` (a banner frozen on its last frame reads as
 * broken).
 */
export default function BannerMedia({
  image,
  video,
  alt = "",
  priority = false,
  className,
  style,
  sizes = "100vw",
  /** Sized rather than filled, for a container that has no height of its own. */
  width,
  height,
}) {
  /**
   * Whether this visitor asked their system for less motion.
   *
   * useSyncExternalStore rather than an effect: matchMedia is a browser-only
   * store, and this is the supported way to read one. Setting state inside an
   * effect instead would queue a second render on every banner on the page, and
   * is what react-hooks/set-state-in-effect exists to catch.
   *
   * It also SUBSCRIBES, so toggling the preference in the OS stops a playing
   * banner rather than waiting for a reload.
   */
  const subscribe = useCallback((notify) => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return () => {};
    mq.addEventListener("change", notify);
    return () => mq.removeEventListener("change", notify);
  }, []);

  const reducedMotion = useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
    // The server cannot know, and guessing "reduce" would withhold the video
    // from everyone until hydration. The same value is used for the hydration
    // render, so the two agree.
    () => false
  );

  /** Set when the browser tells us it cannot play this file. */
  const [failed, setFailed] = useState(false);

  // Derived, not stored: three facts decide it and none of them is an event.
  const play = Boolean(video) && !reducedMotion && !failed;

  const sized = Number.isFinite(width) && Number.isFinite(height);

  return (
    <>
      {sized ? (
        <Image
          src={image}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          priority={priority}
          className={className}
          style={{ objectFit: "cover", width: "100%", height: "100%", ...style }}
        />
      ) : (
        <Image
          src={image}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={className}
          style={{ objectFit: "cover", ...style }}
        />
      )}

      {play && (
        <video
          // Keyed on the source so replacing the video swaps the element rather
          // than leaving the old one playing underneath a new one.
          key={video}
          src={video}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          // Decorative: the alt text on the image beneath already describes it,
          // and announcing a silent looping banner twice helps nobody.
          aria-hidden="true"
          tabIndex={-1}
          className={className}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            ...style,
          }}
          // A 404, a codec it cannot decode, a network that gave up: all land
          // here, and all mean "stop covering the picture".
          onError={() => setFailed(true)}
        />
      )}
    </>
  );
}
