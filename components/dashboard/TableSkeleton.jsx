import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholder for a dashboard DataTable.
 *
 * It mirrors the real table's STRUCTURE, because a skeleton that does not is
 * worse than none: the previous version put the search toolbar inside the card
 * (the real one sits above it), padded rows at `p-4` where the table uses
 * `px-8 py-6`, and forced a `min-w-[800px]` track inside the card — so on a
 * normal dashboard width the rows visibly overran the card's rounded border,
 * and everything jumped sideways the moment real data replaced it.
 *
 * `columns` should match the page's actual column count so the placeholder
 * columns land where the real ones will. `firstColumnIsMedia` draws the leading
 * cell as a thumbnail, which is right for products and banners and wrong for
 * orders or coupons.
 */
export default function TableSkeleton({
  rows = 5,
  columns = 5,
  firstColumnIsMedia = false,
  showToolbar = true,
}) {
  // The last column is the actions cell in every dashboard table; the first is
  // the identity cell (thumbnail or a two-line label). Everything between is a
  // plain value.
  const middleColumns = Math.max(0, columns - 2);

  return (
    <div
      className="flex w-full flex-col gap-4 animate-in fade-in duration-300"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading…</span>

      {/* Toolbar — outside the card, exactly like DataTable's. */}
      {showToolbar && (
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <Skeleton className="h-10 w-full rounded-xl sm:max-w-sm" />
          <Skeleton className="hidden h-10 w-full rounded-xl sm:block sm:w-[180px]" />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead className="bg-muted/30">
              <tr>
                {Array.from({ length: columns }).map((_, i) => (
                  <th key={i} className="!px-8 !py-5 text-start">
                    <Skeleton
                      className="h-4 rounded-md"
                      style={{ width: i === columns - 1 ? "4rem" : "5.5rem" }}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, r) => (
                <tr key={r} className="border-t border-border/60">
                  {/* Identity cell */}
                  <td className="!px-8 !py-6 align-middle">
                    {firstColumnIsMedia ? (
                      <Skeleton className="h-14 w-14 rounded-xl" />
                    ) : (
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-4 w-32 rounded-md" />
                        <Skeleton className="h-3 w-20 rounded-md" />
                      </div>
                    )}
                  </td>

                  {Array.from({ length: middleColumns }).map((_, c) => (
                    <td key={c} className="!px-8 !py-6 align-middle">
                      {/* Alternating widths so the block does not read as a
                          single grey slab, without pretending to know what each
                          column actually holds. */}
                      <Skeleton
                        className="h-4 rounded-md"
                        style={{ width: c % 3 === 1 ? "3.5rem" : "5rem" }}
                      />
                    </td>
                  ))}

                  {columns > 1 && (
                    <td className="!px-8 !py-6 align-middle">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-9 w-20 rounded-xl" />
                        <Skeleton className="h-9 w-20 rounded-xl" />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination — DataTable renders this below the card too. */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40 rounded-md" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-4 w-16 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  );
}
