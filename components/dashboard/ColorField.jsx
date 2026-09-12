"use client";

import { useState } from "react";

/**
 * One colour, chosen by wheel or typed as hex.
 *
 * Extracted from the product form's colour picker, which had grown the same
 * wheel-plus-hex pair. Two controls rather than one because they answer
 * different needs: the wheel is for choosing by eye, the hex box is for pasting
 * a code from wherever the image was graded. They drive each other, so neither
 * becomes a second place the truth can live.
 *
 * `value` is a "#rrggbb" string or null. Null is a real state, not an empty
 * one — it means "whatever this was before anyone chose", which for banner text
 * is white. The caller decides what null renders as; this control only reports
 * that nothing was picked.
 */

/** #rgb or #rrggbb, with or without the hash, in any case. */
export function parseHex(raw) {
  const t = String(raw ?? "").trim().replace(/^#/, "");
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(t)) return null;
  const full = t.length === 3 ? t.split("").map((c) => c + c).join("") : t;
  return `#${full.toLowerCase()}`;
}

/**
 * Perceived brightness, Rec. 601.
 *
 * Used to decide whether the swatch needs a dark border to be visible against
 * the card. A flat channel average calls yellow dark and it disappears.
 */
export function isLightHex(hex) {
  const h = (parseHex(hex) ?? "#000000").slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 165;
}

export default function ColorField({
  value,
  onChange,
  label,
  hint,
  /** Shown on the swatch and used by the wheel while `value` is null. */
  fallback = "#ffffff",
  /** Quick picks, so the common answer is one click rather than a colour wheel. */
  presets = ["#ffffff", "#111111", "#f5e6d3", "#c9a227", "#b3261e", "#1e3a5f"],
}) {
  const current = parseHex(value) ?? fallback;
  /**
   * The raw text in the hex box, kept apart from the committed value.
   *
   * The box holds exactly what was typed so an unfinished entry is not
   * rewritten under the cursor, and the swatch only follows once the text
   * actually parses.
   */
  const [text, setText] = useState(parseHex(value) ?? "");

  const commit = (hex) => {
    onChange(hex);
    setText(hex ?? "");
  };

  return (
    <div className="flex flex-col gap-2.5">
      {label && (
        <span className="text-start text-sm font-semibold text-muted-foreground">
          {label}
        </span>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* The wheel. A label wrapping a transparent input, so the swatch
            itself is the control rather than a separate button beside it. */}
        <label
          className="relative h-10 w-12 shrink-0 cursor-pointer rounded-xl border border-border"
          style={{
            backgroundColor: current,
            boxShadow: isLightHex(current) ? "inset 0 0 0 1px rgba(0,0,0,.15)" : "none",
          }}
          title={label}
        >
          <input
            type="color"
            value={current}
            onChange={(e) => commit(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={label}
          />
        </label>

        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            const parsed = parseHex(e.target.value);
            if (parsed) onChange(parsed);
            // An emptied box means "no choice", which is a real state.
            else if (e.target.value.trim() === "") onChange(null);
          }}
          placeholder={fallback}
          spellCheck={false}
          dir="ltr"
          aria-label={label}
          aria-invalid={text.trim() !== "" && !parseHex(text)}
          className={`h-10 w-32 rounded-xl border bg-muted/30 px-3 font-mono text-sm ${
            text.trim() !== "" && !parseHex(text)
              ? "border-destructive/60"
              : "border-border"
          }`}
        />

        {presets.map((hex) => (
          <button
            key={hex}
            type="button"
            onClick={() => commit(hex)}
            title={hex}
            aria-label={hex}
            aria-pressed={parseHex(value) === hex}
            className={`h-7 w-7 shrink-0 rounded-full transition-transform hover:scale-110 ${
              parseHex(value) === hex ? "ring-2 ring-primary ring-offset-2" : ""
            }`}
            style={{
              backgroundColor: hex,
              boxShadow: isLightHex(hex) ? "inset 0 0 0 1px rgba(0,0,0,.2)" : "none",
            }}
          />
        ))}

        {value && (
          <button
            type="button"
            onClick={() => commit(null)}
            className="text-xs text-muted-foreground underline"
          >
            إعادة تعيين
          </button>
        )}
      </div>

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
