"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Check, Plus, X } from "lucide-react";
import { COLOR_PALETTE, resolveColor } from "@/lib/products/colors";

/**
 * Colour picker for the product form.
 *
 * Replaces a free-text "Red, Blue, Black" input. That field was the reason the
 * storefront could not draw real swatches: an admin typed whatever they liked,
 * with no shared vocabulary between what was stored and what the shop knew how
 * to render, and a typo silently became a new colour.
 *
 * Values are stored as the Arabic colour name, which is what every existing
 * product row and every historic OrderItem.color already holds — so this picker
 * is compatible with the data as it stands, with no migration.
 *
 * Colours outside the palette are still allowed (and shown as chips), because
 * the shop must be able to sell something we did not think of.
 */
export default function ColorMultiSelect({
  value = [],
  onChange,
  /** { name: hex } chosen by the shop, for colours the palette does not know. */
  hexes = {},
  onHexChange,
}) {
  const locale = useLocale();
  const [customName, setCustomName] = useState("");
  /**
   * The wheel's current colour, for the name being typed.
   *
   * A sensible mid-tone rather than black: black is already in the palette one
   * click away, so starting there makes the wheel look like it did nothing.
   */
  const [customHex, setCustomHex] = useState("#c0392b");
  /**
   * What is typed in the hex box, kept apart from `customHex`.
   *
   * The box holds the RAW text and the swatch holds a parsed colour, so an
   * unfinished or invalid entry leaves the swatch on its last good value
   * instead of blanking it — and the box keeps exactly what was typed rather
   * than rewriting it under the cursor.
   *
   * It does not make the preview monotonic: "#dc1" is a valid three-digit hex
   * on the way to "#dc143c", so the swatch does pass through one wrong colour
   * mid-word. Suppressing that would mean refusing three-digit hex, or only
   * updating on blur, and both cost more than the flicker does.
   */
  const [hexInput, setHexInput] = useState("#c0392b");

  /**
   * Read a typed hex.
   *
   * Tolerant of what people actually paste: a missing "#", stray spaces, upper
   * case, and the three-digit shorthand. Returns null for anything else so the
   * caller can leave the swatch alone rather than blanking it mid-keystroke.
   */
  const parseHex = (raw) => {
    const t = String(raw ?? "").trim().replace(/^#/, "");
    if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(t)) return null;
    const full =
      t.length === 3
        ? t.split("").map((c) => c + c).join("")
        : t;
    return `#${full.toLowerCase()}`;
  };

  /** Typing in the hex box drives the wheel. */
  const onHexTyped = (raw) => {
    setHexInput(raw);
    const parsed = parseHex(raw);
    if (parsed) setCustomHex(parsed);
  };

  /** Turning the wheel drives the hex box. */
  const onWheelPicked = (hex) => {
    setCustomHex(hex);
    setHexInput(hex);
  };

  /** Record (or clear) the swatch for one name without disturbing the others. */
  const setHex = (name, hex) => {
    if (!onHexChange) return;
    onHexChange((prev) => {
      const next = { ...(prev ?? {}) };
      if (hex) next[name] = hex;
      else delete next[name];
      return next;
    });
  };

  // Memoised: a fresh `[]` on every render would change the identity that the
  // useMemo below depends on, so it recomputed each time.
  const selected = useMemo(() => (Array.isArray(value) ? value : []), [value]);

  // Anything already on the product that is not one of the palette entries —
  // typed by hand before this picker existed, or added via "custom" below.
  const customSelected = useMemo(() => {
    const paletteNames = new Set(
      COLOR_PALETTE.flatMap((c) => [c.nameAr, c.nameEn])
    );
    return selected.filter((name) => !paletteNames.has(name));
  }, [selected]);

  const isSelected = (option) =>
    selected.includes(option.nameAr) || selected.includes(option.nameEn);

  const toggle = (option) => {
    if (isSelected(option)) {
      onChange(
        selected.filter((n) => n !== option.nameAr && n !== option.nameEn)
      );
    } else {
      onChange([...selected, option.nameAr]);
    }
  };

  const addCustom = () => {
    const name = customName.trim();
    if (!name) return;
    // Case- and orthography-insensitive duplicate check, so "ابيض" cannot be
    // added alongside "أبيض".
    const already = selected.some(
      (n) => resolveColor(n).key === resolveColor(name).key
    );
    if (!already) {
      onChange([...selected, name]);
      // The wheel's colour belongs to THIS name. Recorded on add rather than
      // derived later, because the name is all that gets stored and the palette
      // cannot guess "قرمزي".
      setHex(name, customHex);
    }
    setCustomName("");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {COLOR_PALETTE.map((option) => {
          const active = isSelected(option);
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => toggle(option)}
              title={locale === "en" ? option.nameEn : option.nameAr}
              aria-pressed={active}
              className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40"
              }`}
            >
              <span
                className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/15"
                style={{ backgroundColor: option.hex }}
              />
              <span>{locale === "en" ? option.nameEn : option.nameAr}</span>
              {active && <Check size={13} className="shrink-0" />}
            </button>
          );
        })}
      </div>

      {customSelected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {customSelected.map((name) => {
            const swatch = resolveColor(name, hexes);
            // Whether the SHOP chose this colour, as opposed to it falling back
            // to the neutral chip. An unset swatch is the state that started
            // all this — a grey dot with nothing saying it could be changed —
            // so it says so, with a dashed ring and a tooltip.
            const chosen = Boolean(parseHex(hexes?.[name]));
            return (
              <span
                key={name}
                className="flex items-center gap-2 rounded-full border border-dashed border-border bg-muted/30 px-3 py-1.5 text-xs"
              >
                {/* The swatch IS the control — click it to re-pick. A separate
                    edit button would be a second thing to find for something
                    the colour itself already represents. */}
                <label
                  className={`relative h-4 w-4 shrink-0 cursor-pointer rounded-full ${
                    chosen
                      ? "ring-1 ring-black/15"
                      : "ring-2 ring-dashed ring-primary/60"
                  }`}
                  style={{ backgroundColor: swatch.hex }}
                  title={
                    chosen
                      ? `${name} — ${swatch.hex}`
                      : locale === "en"
                        ? "No colour chosen — click to pick one"
                        : "لم يُختر لون — اضغط لاختياره"
                  }
                >
                  <input
                    type="color"
                    value={swatch.hex}
                    onChange={(e) => setHex(name, e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label={
                      locale === "en" ? `Colour for ${name}` : `لون ${name}`
                    }
                  />
                </label>
                {name}
                <button
                  type="button"
                  onClick={() => {
                    onChange(selected.filter((n) => n !== name));
                    setHex(name, null);
                  }}
                  aria-label={`remove ${name}`}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X size={13} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        {/* The wheel sits with the name field, so a colour is named and shown
            in one action. Typing alone was the whole problem: "قرمزي" is not in
            the palette, so the chip rendered a neutral grey dot and the shop
            had no way to say what the colour actually looks like. */}
        <label
          className="relative h-10 w-12 shrink-0 cursor-pointer rounded-xl border border-border ring-1 ring-inset ring-black/5"
          style={{ backgroundColor: customHex }}
          title={locale === "en" ? "Pick a colour" : "اختر لونًا"}
        >
          <input
            type="color"
            value={customHex}
            onChange={(e) => onWheelPicked(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={locale === "en" ? "Pick a colour" : "اختر لونًا"}
          />
        </label>
        <input
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          // Enter would otherwise submit the surrounding product form.
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder={
            locale === "en" ? "Other colour…" : "لون آخر… مثل قرمزي"
          }
          className="h-10 flex-1 rounded-xl border border-border bg-muted/30 px-3 text-sm"
        />
        {/* Either way of saying the same thing: turn the wheel, or type the
            code. Designers work in hex and copy it from wherever the product
            photo was graded; the wheel is for choosing by eye. They drive each
            other, so neither is a second place the truth can live. */}
        <input
          value={hexInput}
          onChange={(e) => onHexTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="#dc143c"
          spellCheck={false}
          dir="ltr"
          aria-label={locale === "en" ? "Hex colour" : "رمز اللون"}
          aria-invalid={hexInput.trim() !== "" && !parseHex(hexInput)}
          className={`h-10 w-28 rounded-xl border bg-muted/30 px-3 font-mono text-sm ${
            hexInput.trim() !== "" && !parseHex(hexInput)
              ? "border-destructive/60"
              : "border-border"
          }`}
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!customName.trim()}
          className="flex h-10 items-center gap-1 rounded-xl border border-border px-3 text-sm disabled:opacity-40"
        >
          <Plus size={14} />
          {locale === "en" ? "Add" : "إضافة"}
        </button>
      </div>
    </div>
  );
}
