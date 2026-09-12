"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

/**
 * Share this product.
 *
 * Two mechanisms, because no single one works everywhere:
 *
 *   navigator.share    On a phone this opens the real OS sheet — WhatsApp,
 *                      Instagram, Messages — which is how this shop's customers
 *                      actually pass a shoe to a friend. It exists only in a
 *                      secure context, and on desktop Firefox not at all.
 *   clipboard          The fallback, and the better answer on a desktop anyway.
 *
 * Both can fail for reasons that are not the shopper's fault — permission
 * denied, an insecure origin, a browser that has neither — so there is a third
 * path that selects the URL in a temporary field and lets them copy it
 * themselves. The button never does nothing.
 */
export default function ShareProduct({ title, locale = "ar" }) {
  const ar = locale === "ar";
  const [state, setState] = useState("idle"); // idle | copied | failed

  const say = (next) => {
    setState(next);
    // Long enough to read, short enough that the button is ready again before
    // anyone tries twice.
    setTimeout(() => setState("idle"), 2200);
  };

  const share = async () => {
    // Read at click time, not render time: the gallery and colour picker push
    // state into the URL, so this captures what the shopper is actually looking
    // at rather than what the page first loaded as.
    const url = typeof window === "undefined" ? "" : window.location.href;
    if (!url) return;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        // Dismissing the OS sheet rejects with AbortError. That is a decision,
        // not a failure, and must not fall through to copying a link they
        // chose not to send.
        if (err?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      say("copied");
      return;
    } catch {
      // Clipboard needs a secure context and, in some browsers, permission.
    }

    // Last resort: put the URL somewhere it can be copied by hand.
    try {
      const field = document.createElement("input");
      field.value = url;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(field);
      say(ok ? "copied" : "failed");
    } catch {
      say("failed");
    }
  };

  const label =
    state === "copied"
      ? ar ? "تم نسخ الرابط" : "Link copied"
      : state === "failed"
        ? ar ? "تعذّر النسخ" : "Could not copy"
        : ar ? "مشاركة" : "Share";

  return (
    <button
      type="button"
      onClick={share}
      // The visible text already changes to confirm, so aria-live announces it
      // rather than the label being the only signal.
      aria-live="polite"
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 14px",
        border: "1px solid #ced4da",
        borderRadius: "8px",
        background: "#fff",
        color: state === "failed" ? "#a4262c" : "#1a1a2e",
        fontSize: "13px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "border-color 160ms ease, color 160ms ease",
        whiteSpace: "nowrap",
      }}
    >
      {state === "copied" ? (
        <Check size={16} strokeWidth={2.5} aria-hidden="true" />
      ) : (
        <Share2 size={16} strokeWidth={2} aria-hidden="true" />
      )}
      <span>{label}</span>
    </button>
  );
}
