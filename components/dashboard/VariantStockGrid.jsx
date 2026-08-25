"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { resolveColor } from "@/lib/products/colors";
import { stockFor, totalStock, variantKey } from "@/lib/products/variants";

/**
 * Stock, one box per (colour, size) pair.
 *
 * This replaced a single "stock" number for the whole product. That number
 * covered every size and every colour at once, so a shoe with nineteen pairs
 * across five sizes could be ordered nineteen times in one size — the shop had
 * no way to say it held one pair in 41 and four in 38, and the checkout had no
 * way to find out.
 *
 * A GRID, not a list of fifteen fields. Colours run down and sizes across, which
 * is how the stock is counted in the room: pick up the black ones, count them by
 * size, type the row. Every row and column carries its own total, so a number
 * typed into the wrong box shows up as a row that does not match the shelf
 * rather than hiding inside a single grand total.
 *
 * Sizes and colours come from the choices already made above it. Nothing is
 * asked for twice, and a pair that is not sold has no box at all.
 */
export default function VariantStockGrid({ sizes, colors, variants, onChange }) {
  const t = useTranslations("Dashboard");

  const setCell = (size, color, raw) => {
    // Empty reads as zero rather than NaN — clearing a box to retype it must
    // not put the grand total into an error state mid-keystroke.
    const next = Math.max(0, Math.round(Number(raw) || 0));
    const without = variants.filter(
      (v) => variantKey(v.size, v.color) !== variantKey(size, color)
    );
    onChange([...without, { size, color, stock: next }]);
  };

  if (sizes.length === 0 || colors.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        {t("variantsNeedSizesAndColors")}
      </p>
    );
  }

  const grandTotal = totalStock(
    variants.filter((v) => sizes.includes(v.size) && colors.includes(v.color))
  );

  return (
    <div className="space-y-3">
      {/* The grid scrolls on its own rather than widening the dialog: at eight
          sizes on a tablet the row is wider than the form. */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/40">
              <th className="sticky inset-inline-start-0 z-10 bg-muted/40 p-2 text-start text-xs font-bold">
                {t("colors")}
              </th>
              {sizes.map((size) => (
                <th key={size} className="p-2 text-center text-xs font-bold">
                  {size}
                </th>
              ))}
              <th className="p-2 text-center text-xs font-bold text-muted-foreground">
                {t("total")}
              </th>
            </tr>
          </thead>
          <tbody>
            {colors.map((color) => {
              const swatch = resolveColor(color);
              const rowTotal = sizes.reduce(
                (sum, size) => sum + stockFor(variants, size, color),
                0
              );

              return (
                <tr key={color} className="border-t border-border">
                  <th className="sticky inset-inline-start-0 z-10 bg-background p-2 text-start font-medium">
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <span
                        aria-hidden="true"
                        className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/15"
                        style={{ backgroundColor: swatch.hex }}
                      />
                      {color}
                    </span>
                  </th>

                  {sizes.map((size) => (
                    <td key={size} className="p-1.5">
                      <input
                        type="number"
                        min="0"
                        // A tablet should offer digits, not a full keyboard.
                        inputMode="numeric"
                        value={stockFor(variants, size, color)}
                        onChange={(e) => setCell(size, color, e.target.value)}
                        // Selects on focus so a correction is one tap and a
                        // number rather than a tap, a delete and a number.
                        onFocus={(e) => e.target.select()}
                        aria-label={`${color} ${size}`}
                        className="h-11 w-14 rounded-lg border border-input bg-muted/30 text-center focus-visible:ring-2 focus-visible:ring-primary/20"
                      />
                    </td>
                  ))}

                  <td className="p-2 text-center font-semibold tabular-nums text-muted-foreground">
                    {rowTotal}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-sm font-semibold">
        {t("totalStock")}:{" "}
        <span className="tabular-nums">{grandTotal}</span>
      </p>
    </div>
  );
}
