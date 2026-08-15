"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * A next/image with a neutral shimmer behind it until the bitmap arrives.
 *
 * The hero is the largest thing on the page and the last to paint, so until it
 * did the visitor saw an empty coloured band with the headline floating over
 * nothing — indistinguishable from a broken image.
 *
 * TWO DELIBERATE CHOICES, both about failure modes:
 *
 * 1. The skeleton is an UNDERLAY, and the image's own visibility is never
 *    gated on JavaScript. An `<img>` paints nothing until it has decoded, so
 *    the shimmer shows through on its own and the photo simply covers it. The
 *    first version faded the image in from `opacity: 0` on load, which meant a
 *    missed `onLoad` — a cached response that resolved before React attached
 *    the handler, a hydration hiccup, JS failing entirely — left the most
 *    important element on the page invisible forever. Now the worst case is a
 *    shimmer left mounted behind a fully painted photo, which nobody can see.
 *
 * 2. It renders a FRAGMENT, not a wrapper. Wrapping would take the image out of
 *    flow and collapse any container that derives its height from it — the hero
 *    does exactly that. The caller is responsible for the nearest ancestor being
 *    positioned; `.wrap-slider` already is.
 *
 * A CSS shimmer rather than `blurDataURL`: banners are admin-uploaded, so there
 * is no build step in which to generate per-image placeholders.
 */
// `alt` is pulled out explicitly rather than left in the spread: it is required
// for accessibility, and hiding it inside `...imageProps` meant a caller could
// omit it with nothing to catch the mistake.
export default function ImageWithSkeleton({ alt, skeletonClassName = "", ...imageProps }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded && (
        <span aria-hidden="true" className={`img-skeleton ${skeletonClassName}`} />
      )}
      <Image
        {...imageProps}
        alt={alt}
        onLoad={() => setLoaded(true)}
        // Also drop the shimmer if the image errors — leaving it spinning would
        // promise a picture that is never coming.
        onError={() => setLoaded(true)}
      />
    </>
  );
}
