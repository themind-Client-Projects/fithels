"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { resolveColor } from "@/lib/products/colors";

/**
 * What a product's stock is actually made of.
 *
 * "60 available" answered how many but never of what — sixty of one colour and
 * twenty of each read identically — and the size row had the same problem one
 * level down: "38: 15" did not say fifteen of which colour, which is the number
 * a shop needs before ordering more.
 *
 * Two levels, so the common question is answered without opening anything:
 *
 *   collapsed — a colour per chip, and a size per chip. Answers "which colours"
 *               and "which sizes" at a glance.
 *   expanded  — the full grid, colours down and sizes across. Answers "how many
 *               black 38s", which is the question you ask once you are already
 *               looking at a product.
 *
 * The grid is deliberately the same shape as the stock editor in the product
 * form, so an admin reads one layout in both places rather than learning two.
 *
 * State is local to the row: no page-level map of open rows to keep in step
 * with a list that filters and paginates underneath it.
 */
export default function StockBreakdown({ row }) {
  const t = useTranslations("Dashboard");
  const [open, setOpen] = useState(false);

  // Sizes in numeric order, from the sizes the product is actually sold in.
  const sizes = useMemo(
    () =>
      Object.keys(row.bySize ?? {}).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      ),
    [row.bySize]
  );

  const colors = useMemo(() => Object.keys(row.byColor ?? {}), [row.byColor]);

  // Looked up rather than searched per cell: a product with eight sizes and six
  // colours would otherwise scan the pair list forty-eight times per render.
  const pairs = useMemo(() => {
    const map = new Map();
    for (const p of row.byPair ?? []) map.set(`${p.size}|${p.color}`, p.stock);
    return map;
  }, [row.byPair]);

  const tone = (qty) =>
    qty === 0
      ? "border-red-200 bg-red-50 text-red-600"
      : qty <= 2
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-border bg-muted/30";

  return (
    <div className="space-y-2">
      {/* Which colours the total is made of. */}
      {colors.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {colors.map((color) => {
            const qty = row.byColor[color] ?? 0;
            const swatch = resolveColor(color);
            return (
              <span
                key={color}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${tone(qty)}`}
                title={`${color}: ${qty}`}
              >
                <span
                  aria-hidden="true"
                  className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/15"
                  style={{ backgroundColor: swatch.hex }}
                />
                <span className="max-w-[7rem] truncate">{color}</span>
                <span className="font-bold tabular-nums">{qty}</span>
              </span>
            );
          })}
        </div>
      )}

      {/* Which sizes, totalled across colours. */}
      <div className="flex flex-wrap items-center gap-1.5">
        {sizes.map((size) => {
          const qty = row.bySize[size] ?? 0;
          return (
            <span
              key={size}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs ${tone(qty)}`}
            >
              <span className="font-bold">{size}</span>
              <span className="tabular-nums">{qty}</span>
            </span>
          );
        })}

        {colors.length > 0 && sizes.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("sizeByColor")}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {open && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-muted/40">
                <th className="p-2 text-start font-bold">{t("colors")}</th>
                {sizes.map((size) => (
                  <th key={size} className="p-2 text-center font-bold">
                    {size}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {colors.map((color) => {
                const swatch = resolveColor(color);
                return (
                  <tr key={color} className="border-t border-border">
                    <th className="p-2 text-start font-medium">
                      <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <span
                          aria-hidden="true"
                          className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/15"
                          style={{ backgroundColor: swatch.hex }}
                        />
                        {color}
                      </span>
                    </th>
                    {sizes.map((size) => {
                      const qty = pairs.get(`${size}|${color}`) ?? 0;
                      return (
                        <td
                          key={size}
                          className={`p-2 text-center tabular-nums ${
                            qty === 0
                              ? "text-red-500"
                              : qty <= 2
                                ? "font-semibold text-amber-600"
                                : ""
                          }`}
                        >
                          {qty}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
