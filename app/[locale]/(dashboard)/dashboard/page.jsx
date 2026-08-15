"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { formatMoney } from "@/lib/currency";
import StatsCard from "@/components/dashboard/StatsCard";
import OrderStatusBadge from "@/components/dashboard/OrderStatusBadge";
import DataTable from "@/components/dashboard/DataTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShoppingCart,
  DollarSign,
  Package,
  Users,
  Truck,
  TicketPercent,
  XCircle,
  AlertTriangle,
} from "lucide-react";

export default function DashboardOverviewPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const t = useTranslations("Dashboard");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  // Shared formatter — these four files each had their own copy that
  // hardcoded $ and en-US, so the dashboard showed a different figure
  // than the storefront for the same order.
  const formatCurrency = (amount) => formatMoney(amount, "IQD");

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("ar-SA", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const recentOrderColumns = [
    {
      header: t("orderId"),
      accessorKey: "id",
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground font-medium">
          #{row.id.slice(-6).toUpperCase()}
        </span>
      ),
    },
    {
      header: t("customer"),
      accessorKey: "user",
      cell: ({ row }) => (
        <span className="font-semibold text-sm text-foreground">{row.user?.name || row.user?.email || "—"}</span>
      ),
    },
    {
      header: t("total"),
      accessorKey: "total",
      cell: ({ row }) => <span className="font-bold text-sm text-foreground">{formatCurrency(row.total)}</span>,
    },
    {
      header: t("status"),
      accessorKey: "status",
      cell: ({ row }) => <OrderStatusBadge status={row.status} />,
    },
    {
      header: t("date"),
      accessorKey: "createdAt",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm font-medium">{formatDate(row.createdAt)}</span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("overview")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("welcomeBack")}، <span className="text-primary font-semibold">{user?.fullName || "Admin"}</span>! {t("storeOverview")}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={ShoppingCart}
          label={t("totalOrders")}
          value={stats?.totalOrders?.toLocaleString("en-US") || "0"}
        />
        <StatsCard
          icon={DollarSign}
          label={t("revenueCollected")}
          value={formatCurrency(stats?.totalRevenue || 0)}
        />
        <StatsCard
          icon={Package}
          label={t("activeProducts")}
          value={stats?.activeProducts?.toLocaleString("en-US") || "0"}
        />
        <StatsCard
          icon={Users}
          label={t("customersCount")}
          value={stats?.totalCustomers?.toLocaleString("en-US") || "0"}
        />
      </div>

      {/* The figures the single "revenue" number used to conflate. For a
          cash-on-delivery shop, money still out with drivers is not revenue,
          but it is the number that decides whether to restock. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={Truck}
          label={t("outstandingRevenue")}
          value={formatCurrency(stats?.outstandingRevenue || 0)}
          trend={`${stats?.outstandingOrders ?? 0} ${t("ordersWord")}`}
        />
        <StatsCard
          icon={TicketPercent}
          label={t("discountsGiven")}
          value={formatCurrency(stats?.totalDiscounts || 0)}
        />
        <StatsCard
          icon={XCircle}
          label={t("cancelledOrders")}
          value={(stats?.cancelledOrders ?? 0).toLocaleString("en-US")}
        />
        <StatsCard
          icon={AlertTriangle}
          label={t("refundDue")}
          value={formatCurrency(stats?.refundDueAmount || 0)}
          trend={
            stats?.refundDueOrders
              ? `${stats.refundDueOrders} ${t("needsReconciliation")}`
              : undefined
          }
        />
      </div>

      {/* Recent orders */}
      <div style={{ borderRadius: "1rem", border: "1px solid #e9ecef", backgroundColor: "#fff", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "2rem", borderBottom: "1px solid #f1f3f5" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1a1a2e", margin: 0 }}>{t("recentOrders")}</h2>
          <p style={{ fontSize: "0.875rem", color: "#6c757d", marginTop: "0.25rem", marginBottom: 0 }}>
            {t("recentOrdersDesc")}
          </p>
        </div>
        <div style={{ padding: "1.5rem" }}>
          {stats?.recentOrders && stats.recentOrders.length > 0 ? (
            <DataTable columns={recentOrderColumns} data={stats.recentOrders} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem 0", backgroundColor: "#f8f9fa", borderRadius: "0.75rem", margin: "1rem", border: "1px dashed #ced4da" }}>
              <div style={{ display: "flex", width: "5rem", height: "5rem", alignItems: "center", justifyContent: "center", borderRadius: "9999px", backgroundColor: "rgba(26, 26, 46, 0.05)", marginBottom: "1rem" }}>
                <ShoppingCart style={{ width: "2.5rem", height: "2.5rem", color: "rgba(26, 26, 46, 0.4)" }} />
              </div>
              <p style={{ fontSize: "1.125rem", fontWeight: 600, color: "#1a1a2e", margin: 0 }}>{t("noOrders")}</p>
              <p style={{ fontSize: "0.875rem", color: "#6c757d", marginTop: "0.25rem", marginBottom: 0 }}>{t("noOrdersDesc")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
