"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import AnalyticsTable from "@/components/dashboard/AnalyticsTable";
import { formatMoney } from "@/lib/currency";
import {
  ShoppingCart, DollarSign, Truck, TicketPercent,
  XCircle, Users, Package, AlertTriangle, Boxes,
} from "lucide-react";

const PERIODS = ["1m", "3m", "6m", "12m"];

/** Colour for each customer tier. Inactive is amber — it is a prompt, not a fault. */
const TIER_STYLE = {
  vip: "bg-violet-50 text-violet-700 border-violet-200",
  repeat: "bg-emerald-50 text-emerald-700 border-emerald-200",
  new: "bg-sky-50 text-sky-700 border-sky-200",
  inactive: "bg-amber-50 text-amber-700 border-amber-200",
};

function Figure({ icon: Icon, label, value, hint, tone }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2.5">
        {Icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-foreground">
            <Icon className="h-4 w-4" strokeWidth={2} />
          </span>
        )}
        <h3 className="m-0 text-sm font-medium text-muted-foreground">{label}</h3>
      </div>
      <div
        className={`text-2xl font-bold leading-none tracking-tight ${
          tone === "warn" ? "text-amber-600" : tone === "bad" ? "text-red-600" : "text-foreground"
        }`}
      >
        {value}
      </div>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Section({ title, note, children }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {note ? (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{note}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** A wide table that scrolls inside its own card rather than the page. */
function Scroller({ children }) {
  return (
    <Card>
      <CardContent className="p-0 sm:p-0">
        <div className="overflow-x-auto">{children}</div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const ar = locale === "ar";

  const [period, setPeriod] = useState("1m");
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  /** Bumped to ask for the same period again after a failure. */
  const [attempt, setAttempt] = useState(0);

  /**
   * Derived, not stored.
   *
   * "Loading" is simply "what I am holding is not what was asked for" — the
   * answer for another period, or nothing yet. Keeping it as state would mean
   * setting it synchronously inside the effect, which queues a second render on
   * every visit and is what react-hooks/set-state-in-effect exists to catch.
   */
  const loading = !error && (!data || data.period?.key !== period);

  const money = useCallback((usd) => formatMoney(usd || 0, "IQD"), []);

  useEffect(() => {
    /**
     * Aborted on cleanup, not merely ignored.
     *
     * Tapping through the four periods used to leave four requests in flight,
     * each doing real work in Postgres, with three of the answers thrown away
     * on arrival. Aborting stops the request itself, and it is also what
     * guarantees no setState lands after unmount — the await never resolves.
     */
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`/api/dashboard/analytics?period=${period}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("failed");
        const body = await res.json();
        setData(body);
        setError(false);
      } catch (err) {
        // An abort is this component's own doing, not a failure to report.
        if (err?.name !== "AbortError") setError(true);
      }
    })();

    return () => controller.abort();
  }, [period, attempt]);

  // Stable, because the column definitions memoise against it.
  const dateOf = useCallback(
    (iso) =>
      iso
        ? new Date(iso).toLocaleDateString(ar ? "ar-IQ" : "en-GB", {
            year: "numeric", month: "short", day: "numeric",
          })
        : t("neverOrdered"),
    [ar, t]
  );

  const sales = data?.sales;
  const inventory = data?.inventory;

  /**
   * Column and filter definitions.
   *
   * Memoised because the table memoises its filtering and sorting against
   * them: rebuilt inline on every render, these arrays would be new objects
   * each time and every one of those memos would recompute on every keystroke.
   */
  const customerSearchOn = useCallback(
    (c) => `${c.name ?? ""} ${c.email ?? ""} ${c.phone ?? ""}`,
    []
  );

  const customerColumns = useMemo(() => [
    {
      key: "name",
      header: t("customerLabel"),
      sortValue: (c) => c.name || c.email,
      render: (c) => (
        <>
          <span className="font-medium">{c.name || c.email}</span>
          <span className="block text-xs font-normal text-muted-foreground" dir="ltr">
            {c.phone || c.email}
          </span>
        </>
      ),
    },
    {
      key: "tier", header: t("tierLabel"), align: "center",
      sortValue: (c) => c.tier,
      render: (c) => (
        <Badge variant="outline" className={`${TIER_STYLE[c.tier]} font-bold`}>
          {t(`tier${c.tier[0].toUpperCase()}${c.tier.slice(1)}`)}
        </Badge>
      ),
    },
    {
      key: "orders", header: t("ordersInPeriod"), align: "center",
      sortValue: (c) => c.orders,
      render: (c) => <span className="tabular-nums">{c.orders}</span>,
    },
    {
      // The column the sales cards could not answer: WHOSE orders fell through.
      key: "cancelled", header: t("cancelledByCustomer"), align: "center",
      sortValue: (c) => c.cancelledOrders,
      render: (c) =>
        c.cancelledOrders > 0 ? (
          <Badge variant="outline" className="border-red-200 bg-red-50 font-bold text-red-600">
            {c.cancelledOrders}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "completion", header: t("completionRateLabel"), align: "center",
      sortValue: (c) => c.completionRate,
      render: (c) => (
        <>
          <span className="font-semibold tabular-nums">
            {Math.round(c.completionRate * 100)}%
          </span>
          {/* The denominator, because a rate without it invites the wrong read. */}
          <span className="block text-xs text-muted-foreground tabular-nums">
            {c.lifetimeOrders} {t("ordersWord")}
          </span>
        </>
      ),
    },
    {
      key: "spend", header: t("totalSpend"), align: "center",
      sortValue: (c) => c.lifetimeSpend,
      render: (c) => <span className="font-semibold tabular-nums">{money(c.lifetimeSpend)}</span>,
    },
    {
      key: "last", header: t("lastOrder"), align: "center",
      sortValue: (c) => (c.lastOrderAt ? new Date(c.lastOrderAt).getTime() : 0),
      render: (c) => <span className="text-xs text-muted-foreground">{dateOf(c.lastOrderAt)}</span>,
    },
    {
      key: "products", header: t("productsBought"),
      render: (c) => (
        <span className="text-xs text-muted-foreground">
          {c.products.length ? c.products.join("، ") : t("neverOrdered")}
        </span>
      ),
    },
  ], [t, money, dateOf]);

  const customerFilters = useMemo(() => [
    { key: "all", label: t("allLabel") },
    { key: "vip", label: t("tierVip"), test: (c) => c.tier === "vip" },
    { key: "repeat", label: t("tierRepeat"), test: (c) => c.tier === "repeat" },
    { key: "inactive", label: t("tierInactive"), test: (c) => c.tier === "inactive" },
    { key: "cancelled", label: t("withCancellations"), test: (c) => c.cancelledOrders > 0 },
  ], [t]);

  const productSearchOn = useCallback((p) => `${p.titleAr ?? ""} ${p.titleEn ?? ""}`, []);

  const inventoryColumns = useMemo(() => [
    {
      key: "title", header: t("products"),
      sortValue: (p) => (ar ? p.titleAr : p.titleEn),
      render: (p) => (
        <>
          <span className="font-medium">{ar ? p.titleAr : p.titleEn}</span>
          {p.outOfStock ? (
            <Badge variant="destructive" className="ms-2 font-bold">{t("outOfStockLabel")}</Badge>
          ) : p.lowStock ? (
            <Badge variant="outline" className="ms-2 border-amber-500 bg-amber-50 font-bold text-amber-600">
              {t("lowStockLabel")}
            </Badge>
          ) : null}
        </>
      ),
    },
    {
      key: "sellable", header: t("sellableLabel"), align: "center",
      sortValue: (p) => p.sellable,
      render: (p) => <span className="font-semibold tabular-nums">{p.sellable}</span>,
    },
    {
      key: "reserved", header: t("reservedLabel"), align: "center",
      sortValue: (p) => p.reserved,
      render: (p) => <span className="tabular-nums text-muted-foreground">{p.reserved}</span>,
    },
    {
      key: "onHand", header: t("onHandLabel"), align: "center",
      sortValue: (p) => p.onHand,
      render: (p) => <span className="tabular-nums">{p.onHand}</span>,
    },
    {
      key: "bySize", header: t("perSizeStock"),
      render: (p) => (
        <div className="flex flex-wrap gap-1.5">
          {/* Every size it is SOLD in, zeroes included — "which size am I out
              of" is the question this column exists to answer. */}
          {Object.entries(p.bySize).map(([size, qty]) => (
            <span
              key={size}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs ${
                qty === 0
                  ? "border-red-200 bg-red-50 text-red-600"
                  : qty <= 2
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-border bg-muted/30"
              }`}
            >
              <span className="font-bold">{size}</span>
              <span className="tabular-nums">{qty}</span>
            </span>
          ))}
        </div>
      ),
    },
  ], [t, ar]);

  const inventoryFilters = useMemo(() => [
    { key: "all", label: t("allLabel") },
    { key: "out", label: t("outOfStockFilter"), test: (p) => p.outOfStock },
    { key: "low", label: t("lowStockFilter"), test: (p) => p.lowStock },
    { key: "in", label: t("inStockFilter"), test: (p) => !p.outOfStock },
  ], [t]);

  const topSearchOn = useCallback((p) => p.title ?? "", []);

  const topColumns = useMemo(() => [
    {
      key: "title", header: t("products"),
      sortValue: (p) => p.title,
      render: (p) => <span className="font-medium">{p.title}</span>,
    },
    {
      key: "units", header: t("unitsLabel"), align: "center",
      sortValue: (p) => p.units,
      render: (p) => <span className="font-semibold tabular-nums">{p.units}</span>,
    },
    {
      key: "revenue", header: t("revenueLabel"), align: "center",
      sortValue: (p) => p.revenue,
      render: (p) => <span className="tabular-nums">{money(p.revenue)}</span>,
    },
  ], [t, money]);

  return (
    <DashboardShell
      title={t("analytics")}
      description={t("analyticsDesc")}
      action={
        <div className="flex flex-wrap gap-1.5">
          {PERIODS.map((key) => (
            <Button
              key={key}
              size="sm"
              variant={period === key ? "default" : "outline"}
              onClick={() => setPeriod(key)}
              className="!h-9 !w-auto !px-4 rounded-xl text-sm font-semibold"
            >
              {t(`period${key}`)}
            </Button>
          ))}
        </div>
      }
    >
      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
        {t("analyticsAxisNote")}
      </p>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="mb-4 text-sm text-muted-foreground">{t("uploadError.GENERIC")}</p>
            <Button onClick={() => { setError(false); setAttempt((n) => n + 1); }}>{t("retry")}</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          {/* ── Sales ─────────────────────────────────────────────── */}
          <Section title={t("salesSection")}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Figure icon={DollarSign} label={t("revenueCollected")} value={money(sales.collected)}
                hint={`${sales.collectedOrders} ${t("ordersWord")}`} />
              <Figure icon={Truck} label={t("outstandingRevenue")} value={money(sales.outstanding)}
                hint={`${sales.outstandingOrders} ${t("ordersWord")}`} tone="warn" />
              <Figure icon={TicketPercent} label={t("discountsGiven")} value={money(sales.discounts)} />
              <Figure icon={XCircle} label={t("notCompleted")} value={money(sales.cancelledAmount)}
                hint={`${sales.cancelledOrders} ${t("ordersWord")}`} tone="bad" />

              <Figure icon={ShoppingCart} label={t("ordersPlaced")} value={sales.placedOrders} />
              <Figure icon={Package} label={t("unitsSold")} value={sales.unitsSold} />
              <Figure icon={Users} label={t("buyersCount")} value={sales.buyers} />
              <Figure icon={AlertTriangle} label={t("refundDue")} value={money(sales.refundDue)}
                hint={sales.refundDueOrders ? `${sales.refundDueOrders} ${t("needsReconciliation")}` : undefined}
                tone={sales.refundDue > 0 ? "bad" : undefined} />
            </div>
          </Section>

          {/* ── Payment method split ──────────────────────────────── */}
          <Section title={t("paymentSplit")}>
            <Scroller>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/40 text-xs font-bold">
                    <th className="p-3 text-start">{t("paymentMethod")}</th>
                    <th className="p-3 text-center">{t("placedLabel")}</th>
                    <th className="p-3 text-center">{t("paidLabel")}</th>
                    <th className="p-3 text-center">{t("outstandingLabel")}</th>
                    <th className="p-3 text-center">{t("cancelledLabel")}</th>
                    <th className="p-3 text-center">{t("failedLabel")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[["COD", t("codLabel")], ["WAYLE", t("onlineLabel")]].map(([key, label]) => {
                    const m = sales.byMethod[key] ?? {};
                    return (
                      <tr key={key} className="border-t border-border">
                        <th className="p-3 text-start font-semibold">{label}</th>
                        <td className="p-3 text-center tabular-nums">{m.placed ?? 0}</td>
                        <td className="p-3 text-center">
                          <span className="font-semibold tabular-nums">{money(m.paidAmount)}</span>
                          <span className="block text-xs text-muted-foreground">{m.paid ?? 0}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="tabular-nums">{money(m.outstandingAmount)}</span>
                          <span className="block text-xs text-muted-foreground">{m.outstanding ?? 0}</span>
                        </td>
                        <td className="p-3 text-center tabular-nums">{m.cancelled ?? 0}</td>
                        <td className="p-3 text-center tabular-nums text-muted-foreground">
                          {/* Online only: a cash order has no link to abandon. */}
                          {key === "WAYLE" ? (m.failed ?? 0) + (m.expired ?? 0) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Scroller>
          </Section>

          {/* ── Customers ─────────────────────────────────────────── */}
          <Section title={t("customersSection")} note={t("customersNote")}>
            <div className="mb-3 flex flex-wrap gap-2">
              {["vip", "repeat", "new", "inactive"].map((tier) => (
                <Badge key={tier} variant="outline" className={`${TIER_STYLE[tier]} font-bold`}>
                  {t(`tier${tier[0].toUpperCase()}${tier.slice(1)}`)}: {data.segments[tier]}
                </Badge>
              ))}
            </div>

            <AnalyticsTable
              rows={data.customers}
              initialSort="spend"
              emptyMessage={t("noCustomersYet")}
              searchPlaceholder={t("searchCustomers")}
              searchOn={customerSearchOn}
              filters={customerFilters}
              columns={customerColumns}
            />
          </Section>

          {/* ── Inventory ─────────────────────────────────────────── */}
          <Section title={t("inventorySection")} note={t("reservedNote")}>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Figure icon={Boxes} label={t("sellableLabel")} value={inventory.totalSellable} />
              <Figure icon={Truck} label={t("reservedLabel")} value={inventory.totalReserved} />
              <Figure icon={Package} label={t("onHandLabel")}
                value={inventory.totalSellable + inventory.totalReserved} />
              <Figure icon={AlertTriangle} label={t("outOfStockLabel")} value={inventory.outOfStockCount}
                hint={`${inventory.lowStockCount} ${t("lowStockLabel")}`}
                tone={inventory.outOfStockCount > 0 ? "bad" : undefined} />
            </div>

            <AnalyticsTable
              rows={inventory.products}
              initialSort="sellable"
              emptyMessage={t("noData")}
              searchPlaceholder={t("searchProducts")}
              searchOn={productSearchOn}
              filters={inventoryFilters}
              columns={inventoryColumns}
            />
          </Section>

          {/* ── Best sellers ──────────────────────────────────────── */}
          <Section title={t("topProductsSection")}>
            <AnalyticsTable
              rows={data.topProducts}
              initialSort="units"
              emptyMessage={t("noSalesInPeriod")}
              searchPlaceholder={t("searchProducts")}
              searchOn={topSearchOn}
              columns={topColumns}
            />
          </Section>
        </div>
      )}
    </DashboardShell>
  );
}
