"use client";

import React, { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { normaliseForSearch, matchesSearch } from "@/lib/search";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, AlertTriangle } from "lucide-react";

/**
 * Highly optimized, reusable DataTable component.
 * Features: Client-side pagination, Global Search, Custom Column Search, Status Filtering.
 */
export default function DataTable({ 
  columns, 
  data, 
  searchKey, // the column key to search against, e.g., "id" or "user.name". If not provided, search is hidden.
  searchPlaceholder = "البحث...",
  filterKey, // the column key to filter against, e.g., "status"
  filterOptions, // Array of { label: string, value: string }
  filterPlaceholder = "تصفية",
  itemsPerPage = 10,
  onRowClick, // Function: (row) => void
  isError = false, // distinguishes a failed fetch from a genuinely empty list
  onRetry,
  // Server-driven paging/filtering. When `serverPage` is given the component
  // renders the rows it was handed instead of slicing locally, because the
  // server already returned exactly one page.
  serverPage,
  serverTotalPages,
  serverTotal,
  onServerPageChange,
  filterValue: controlledFilterValue,
  onFilterChange,
}) {
  const t = useTranslations("Dashboard");
  
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [localFilterValue, setLocalFilterValue] = useState("ALL");
  const isServerPaged = serverPage !== undefined;
  const filterValue = controlledFilterValue ?? localFilterValue;
  const setFilterValue = (val) => {
    setLocalFilterValue(val);
    onFilterChange?.(val);
  };

  // Deep object value getter (e.g., "user.name" from { user: { name: "Ahmed" } })
  const getNestedValue = (obj, path) => {
    if (!path) return "";
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };

  // Memoized Filtering and Searching
  const filteredData = useMemo(() => {
    let processed = [...data];

    // 1. Apply Search
    //
    // The query is normalised the same way the values are: the old code trimmed
    // only the emptiness check and matched with the raw string, so one pasted
    // trailing space hid the record. Normalisation also folds Arabic letter
    // variants, so "احمد" finds "أحمد".
    if (searchKey && searchQuery.trim() !== "") {
      const query = normaliseForSearch(searchQuery);
      const searchKeys = Array.isArray(searchKey) ? searchKey : [searchKey];
      processed = processed.filter((item) =>
        searchKeys.some((key) => matchesSearch(getNestedValue(item, key), query))
      );
    }

    // 2. Apply Dropdown Filter (skipped when the server already filtered)
    if (!isServerPaged && filterKey && filterValue !== "ALL") {
      processed = processed.filter((item) => {
        const val = getNestedValue(item, filterKey);
        return val === filterValue;
      });
    }

    return processed;
  }, [data, searchKey, searchQuery, filterKey, filterValue, isServerPaged]);

  // Pagination Logic
  const totalItems = isServerPaged ? serverTotal ?? filteredData.length : filteredData.length;
  const totalPages = isServerPaged
    ? serverTotalPages ?? 1
    : Math.ceil(totalItems / itemsPerPage) || 1;
  const activePage = isServerPaged ? serverPage : currentPage;

  // Ensure current page is valid after filtering (client-paged mode only)
  if (!isServerPaged && currentPage > totalPages && totalPages > 0) {
    setCurrentPage(totalPages);
  }

  const startIndex = (activePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  // In server mode `data` is already exactly one page.
  const currentData = isServerPaged ? filteredData : filteredData.slice(startIndex, endIndex);
  const goToPage = (next) =>
    isServerPaged ? onServerPageChange?.(next) : setCurrentPage(next);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Controls: Search and Filter */}
      {(searchKey || filterOptions) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {searchKey && (
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // reset to page 1 on search
                }}
                className="pl-3 pr-9"
                style={{ paddingRight: "2.5rem" }}
              />
            </div>
          )}

          {filterOptions && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground hidden sm:block" />
              <Select 
                value={filterValue} 
                onValueChange={(val) => {
                  setFilterValue(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder={filterPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">الكل (ALL)</SelectItem>
                  {filterOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Table Structure */}
      {/* No extra overflow wrapper here: the Table primitive already renders its
          own `overflow-x-auto` container. Nesting a second one created two
          scroll areas, only the inner of which actually scrolled — and it made
          the containing block for the sticky actions column ambiguous. */}
      <div className="rounded-xl border border-border/60 bg-white overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                {columns.map((col, index) => {
                  // The last column is always the actions cell. It is pinned to
                  // the inline-end edge so it stays reachable when the table is
                  // wider than the viewport — at 1024px this table needed
                  // 1288px, which put the edit/delete buttons 568px off-screen
                  // with no way to scroll to them.
                  const isActions = index === columns.length - 1;
                  return (
                    <TableHead
                      key={index}
                      className={`whitespace-nowrap px-4 py-4 text-start text-sm font-bold xl:!px-8 xl:!py-5 ${
                        isActions ? "tbl-pin-head sticky end-0 z-20 border-s border-border/60" : ""
                      }`}
                    >
                      {col.header}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isError ? (
                /* A failed fetch used to fall through to "no results", so an
                   admin hitting a 500 or a 403 was told the table was empty —
                   and could reasonably start re-creating records. */
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertTriangle className="h-8 w-8 mb-1 text-amber-500" />
                      <p className="font-semibold text-foreground">{t("loadFailed")}</p>
                      <p className="text-sm text-muted-foreground">{t("loadFailedDesc")}</p>
                      {onRetry && (
                        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
                          {t("retry")}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : currentData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-32 text-center"
                  >
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Search className="h-8 w-8 mb-2 opacity-20" />
                      <p>{t("noResults")}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                currentData.map((row, rowIndex) => (
                  <TableRow 
                    key={rowIndex} 
                    className={`group/row transition-colors hover:bg-muted/40 ${onRowClick ? "cursor-pointer" : ""}`}
                    onClick={() => onRowClick && onRowClick(row)}
                  >
                    {columns.map((col, colIndex) => {
                      const isActions = colIndex === columns.length - 1;
                      return (
                        <TableCell
                          key={colIndex}
                          className={`whitespace-nowrap px-4 py-4 text-start align-middle xl:!px-8 xl:!py-6 ${
                            isActions
                              ? "tbl-pin-cell sticky end-0 z-10 border-s border-border/60 transition-colors"
                              : ""
                          }`}
                        >
                          {col.cell ? col.cell({ row }) : getNestedValue(row, col.accessorKey)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-2">
          <div className="text-sm text-muted-foreground">
            إظهار {totalItems === 0 ? 0 : startIndex + 1} إلى {Math.min(endIndex, totalItems)} من أصل {totalItems} مدخل
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(Math.max(1, activePage - 1))}
              disabled={activePage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" /> {/* ChevronRight points back in RTL */}
            </Button>
            <span className="text-sm font-medium mx-2">
              {activePage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(Math.min(totalPages, activePage + 1))}
              disabled={activePage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" /> {/* ChevronLeft points forward in RTL */}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
