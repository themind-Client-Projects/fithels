"use client";

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
// The dashboard's own folder rather than a second one written here: it already
// handles hamza carriers, tatweel and collapsed whitespace, and two normalisers
// that disagree mean the same search behaves differently in two tables.
import { normaliseForSearch } from "@/lib/search";

/**
 * The analytics tables: search, filter, sort, paginate.
 *
 * One component for all three because they want the same behaviour and it must
 * behave the same way in each — three hand-rolled tables drift, and the one that
 * drifts is the one nobody notices is wrong.
 *
 * EVERY DERIVED VALUE IS COMPUTED DURING RENDER, never stored and never
 * corrected in an effect. Filtering and paging state that is written back by an
 * effect renders once with the stale value and again with the fixed one, which
 * is both a flash of wrong data and the react-hooks/set-state-in-effect this
 * codebase already carries 29 of. There is no timer, no subscription and no
 * fetch here, so there is nothing to leak either.
 *
 * Page resets happen in the EVENT that changes the filter, not in a reaction to
 * it — searching from page 4 of the old list must not leave you on page 4 of a
 * list with two pages.
 */

/** Rows per page. Enough to be useful on a tablet without a scroll marathon. */
const PAGE_SIZE = 10;

export default function AnalyticsTable({
  columns,
  rows,
  /** Pulls the text a row can be found by. */
  searchOn,
  searchPlaceholder,
  /** [{ key, label, test(row) }] — the first is the default. */
  filters = [],
  emptyMessage,
  /** Column key to sort by on first render. */
  initialSort,
  pageSize = PAGE_SIZE,
}) {
  const t = useTranslations("Dashboard");

  const [query, setQuery] = useState("");
  const [filterKey, setFilterKey] = useState(filters[0]?.key ?? null);
  const [sort, setSort] = useState(() =>
    initialSort ? { key: initialSort, direction: "desc" } : null
  );
  const [page, setPage] = useState(1);

  const activeFilter = filters.find((f) => f.key === filterKey);

  const filtered = useMemo(() => {
    const needle = normaliseForSearch(String(query));
    return rows.filter((row) => {
      if (activeFilter?.test && !activeFilter.test(row)) return false;
      if (!needle) return true;
      return normaliseForSearch(String(searchOn ? searchOn(row) : "")).includes(needle);
    });
  }, [rows, query, activeFilter, searchOn]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return filtered;

    // Copied before sorting: sort() mutates, and mutating the memo's input
    // would reorder the caller's array behind its back.
    return [...filtered].sort((a, b) => {
      const av = column.sortValue(a);
      const bv = column.sortValue(b);
      const order =
        typeof av === "string" || typeof bv === "string"
          ? String(av).localeCompare(String(bv))
          : (av ?? 0) - (bv ?? 0);
      return sort.direction === "asc" ? order : -order;
    });
  }, [filtered, sort, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  // Derived, so a filter that shrinks the list below the current page shows the
  // last page rather than an empty one.
  const safePage = Math.min(page, totalPages);
  const visible = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const search = (value) => {
    setQuery(value);
    setPage(1);
  };

  const choose = (key) => {
    setFilterKey(key);
    setPage(1);
  };

  const toggleSort = (column) => {
    if (!column.sortValue) return;
    setPage(1);
    setSort((current) =>
      current?.key === column.key
        ? { key: column.key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key: column.key, direction: "desc" }
    );
  };

  return (
    <div className="space-y-3">
      {(searchOn || filters.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {searchOn && (
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute inset-inline-start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => search(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-11 w-full rounded-xl border border-input bg-muted/30 ps-10 pe-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              />
            </div>
          )}

          {filters.map((f) => {
            // The count is of what this filter WOULD show, so a zero says
            // "nothing matches" before it is clicked rather than after.
            const count = rows.filter((row) => (f.test ? f.test(row) : true)).length;
            return (
              <Button
                key={f.key}
                size="sm"
                variant={filterKey === f.key ? "default" : "outline"}
                onClick={() => choose(f.key)}
                className="!h-11 !w-auto gap-2 rounded-xl !px-4 text-sm font-semibold"
              >
                {f.label}
                <Badge variant="secondary" className="tabular-nums">{count}</Badge>
              </Button>
            );
          })}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/40 text-xs font-bold">
              {columns.map((c) => {
                const active = sort?.key === c.key;
                const Icon = !c.sortValue
                  ? null
                  : active
                  ? sort.direction === "asc" ? ChevronUp : ChevronDown
                  : ChevronsUpDown;
                return (
                  <th
                    key={c.key}
                    className={`p-3 ${c.align === "center" ? "text-center" : "text-start"}`}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c)}
                        className={`inline-flex items-center gap-1 font-bold ${
                          c.align === "center" ? "justify-center" : ""
                        } ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        {c.header}
                        {Icon && <Icon className="h-3.5 w-3.5" />}
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-10 text-center text-muted-foreground">
                  {query ? t("noSearchResults") : emptyMessage}
                </td>
              </tr>
            ) : (
              visible.map((row, i) => (
                <tr key={row.id ?? i} className="border-t border-border align-top">
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`p-3 ${c.align === "center" ? "text-center" : "text-start"}`}
                    >
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {t("showingRange", {
              from: (safePage - 1) * pageSize + 1,
              to: Math.min(safePage * pageSize, sorted.length),
              total: sorted.length,
            })}
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm" variant="outline"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
                className="!h-9 !w-auto rounded-lg !px-3 text-xs font-semibold"
              >
                {t("previous")}
              </Button>
              <span className="px-2 text-xs font-semibold tabular-nums">
                {safePage} / {totalPages}
              </span>
              <Button
                size="sm" variant="outline"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
                className="!h-9 !w-auto rounded-lg !px-3 text-xs font-semibold"
              >
                {t("next")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
