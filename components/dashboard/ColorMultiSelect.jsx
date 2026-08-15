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
export default function ColorMultiSelect({ value = [], onChange }) {
  const locale = useLocale();
  const [customName, setCustomName] = useState("");

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
    if (!already) onChange([...selected, name]);
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
            const swatch = resolveColor(name);
            return (
              <span
                key={name}
                className="flex items-center gap-2 rounded-full border border-dashed border-border bg-muted/30 px-3 py-1.5 text-xs"
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/15"
                  style={{ backgroundColor: swatch.hex }}
                />
                {name}
                <button
                  type="button"
                  onClick={() => onChange(selected.filter((n) => n !== name))}
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
          placeholder={locale === "en" ? "Other colour…" : "لون آخر…"}
          className="h-10 flex-1 rounded-xl border border-border bg-muted/30 px-3 text-sm"
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
