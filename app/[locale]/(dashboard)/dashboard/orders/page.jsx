"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { formatMoney } from "@/lib/currency";
import { allowedNextStatuses } from "@/lib/orders/status";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DataTable from "@/components/dashboard/DataTable";
import TableSkeleton from "@/components/dashboard/TableSkeleton";
import OrderStatusBadge from "@/components/dashboard/OrderStatusBadge";
import PaymentBadge from "@/components/dashboard/PaymentBadge";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus } from "lucide-react";

const StatusSelectCell = ({ order }) => {
  const t = useTranslations("Dashboard");
  const queryClient = useQueryClient();
  const [updating, setUpdating] = React.useState(false);
  const allowedNext = allowedNextStatuses(order.status);
  const isTerminal = allowedNext.length === 0;

  const ALL_STATUSES = [
    { value: "PENDING", label: t("pending") },
    { value: "CONFIRMED", label: t("confirmed") },
    { value: "PROCESSING", label: t("processing") },
    { value: "IN_DELIVERY", label: t("inDelivery") },
    { value: "DELIVERED", label: t("delivered") },
    { value: "CANCELLED", label: t("cancelled") },
  ];

  const getStatusStyles = (status) => {
    switch(status) {
      case "PENDING": return { bg: "#fdf8e6", color: "#ca8a04", border: "#fef08a" };
      case "CONFIRMED": return { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" };
      case "PROCESSING": return { bg: "#faf5ff", color: "#9333ea", border: "#e9d5ff" };
      case "IN_DELIVERY": return { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" };
      case "DELIVERED": return { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" };
      case "CANCELLED": return { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" };
      default: return { bg: "#fff", color: "#1a1a2e", border: "#ced4da" };
    }
  };

  const handleStatusChange = async (e) => {
    e.stopPropagation();
    const newStatus = e.target.value;
    if (newStatus === order.status) return;
    
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["orders"] });
      } else {
        const data = await res.json();
        alert(data.error || "فشل تحديث الحالة. تأكد من الصلاحيات.");
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdating(false);
    }
  };

  const styles = getStatusStyles(order.status);

  return (
    <div 
      onClick={(e) => e.stopPropagation()} 
      style={{ position: "relative", width: "135px" }}
    >
      <select
        value={order.status}
        onChange={handleStatusChange}
        disabled={updating || isTerminal}
        style={{ width: "100%", appearance: "none", WebkitAppearance: "none", MozAppearance: "none", borderRadius: "9999px", border: `1px solid ${updating ? "#ced4da" : styles.border}`, backgroundColor: updating ? "#f8f9fa" : styles.bg, padding: "0.375rem 0.5rem 0.375rem 1.75rem", fontSize: "0.75rem", outline: "none", color: updating ? "#6c757d" : styles.color, fontWeight: 700, cursor: updating ? "wait" : "pointer", transition: "all 0.2s ease" }}
      >
        {/* Only offer transitions the server will accept. DELIVERED and
            CANCELLED are terminal, so those rows become read-only rather than
            presenting options that always fail with a 409. */}
        {ALL_STATUSES.filter(
          (s) => s.value === order.status || allowedNext.includes(s.value)
        ).map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: "0.5rem", pointerEvents: "none", display: "flex", alignItems: "center" }}>
        {updating ? (
          <svg className="animate-spin" style={{ height: "0.875rem", width: "0.875rem", color: "#3b82f6" }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
        ) : (
          <svg style={{ height: "0.875rem", width: "0.875rem", color: styles.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        )}
      </div>
    </div>
  );
};

export default function OrdersPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || "ar";
  const t = useTranslations("Dashboard");
  const queryClient = useQueryClient();

  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [deleting, setDeleting] = React.useState(false);

  // Server-side paging and filtering. The list used to pull every order, with
  // all its line items and product payloads, to render ten rows.
  const [page, setPage] = React.useState(1);
  const [statusFilter, setStatusFilter] = React.useState("ALL");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["orders", page, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await fetch(`/api/orders?${params}`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
    placeholderData: (previous) => previous,
  });

  const orders = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalOrders = data?.total ?? 0;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/orders/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["orders"] });
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete order");
      }
    } catch (error) {
      console.error("Failed to delete order:", error);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const ALL_STATUSES = [
    { value: "PENDING", label: t("pending") },
    { value: "CONFIRMED", label: t("confirmed") },
    { value: "PROCESSING", label: t("processing") },
    { value: "IN_DELIVERY", label: t("inDelivery") },
    { value: "DELIVERED", label: t("delivered") },
    { value: "CANCELLED", label: t("cancelled") },
  ];

  // Shared formatter — these four files each had their own copy that
  // hardcoded $ and en-US, so the dashboard showed a different figure
  // than the storefront for the same order.
  const formatCurrency = (amount) => formatMoney(amount, "USD");

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("ar-SA", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const columns = [
    {
      header: t("orderId"),
      accessorKey: "id",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          #{row.id.slice(-6).toUpperCase()}
        </span>
      ),
    },
    {
      header: t("customer"),
      accessorKey: "user.name",
      cell: ({ row }) => (
        <div>
          <span className="font-medium block text-foreground">
            {row.user?.name || "—"}
          </span>
          <span className="text-xs text-muted-foreground">{row.user?.email}</span>
        </div>
      ),
    },
    {
      header: t("items"),
      accessorKey: "items",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.items?.length || 0}</span>
      ),
    },
    {
      header: t("total"),
      accessorKey: "total",
      cell: ({ row }) => (
        <span className="font-bold text-foreground">{formatCurrency(row.total)}</span>
      ),
    },
    {
      header: t("paymentStatus"),
      accessorKey: "paymentStatus",
      cell: ({ row }) => <PaymentBadge order={row} />,
    },
    {
      header: t("status"),
      accessorKey: "status",
      cell: ({ row }) => <StatusSelectCell order={row} />,
    },
    {
      header: t("date"),
      accessorKey: "createdAt",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      header: t("actions"),
      accessorKey: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteTarget(row)}
            className="!h-auto !py-2 !px-3 !w-auto text-xs font-semibold gap-1.5 rounded-lg shadow-sm bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-red-200 border"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("delete")}
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <DashboardShell 
        title={t("orders")} 
        description={t("manageOrders")}
        action={
          <Button disabled className="gap-2 opacity-50 !px-8 !py-2.5 !w-auto h-11 rounded-xl font-bold shadow-sm">
            <Plus className="h-5 w-5" />
            {t("addOrder")}
          </Button>
        }
      >
        <TableSkeleton rows={5} columns={8} />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title={t("orders")}
      description={t("manageOrders")}
      action={
        <Button onClick={() => router.push(`/${locale}/dashboard/orders/new`)} className="gap-2 !px-8 !py-2.5 !w-auto h-11 rounded-xl font-bold shadow-sm">
          <Plus className="h-5 w-5" />
          {t("addOrder")}
        </Button>
      }
    >
      <DataTable 
        isError={isError}
        onRetry={refetch}
        columns={columns} 
        data={orders} 
        searchKey={["id", "user.name", "user.email", "phone", "user.phone"]} 
        searchPlaceholder={t("searchCustomerOrPhone")}
        filterKey="status"
        filterOptions={ALL_STATUSES}
        filterPlaceholder={t("filterByStatus") || "تصفية حسب الحالة"}
        itemsPerPage={20}
        serverPage={page}
        serverTotalPages={totalPages}
        serverTotal={totalOrders}
        onServerPageChange={setPage}
        filterValue={statusFilter}
        onFilterChange={(val) => {
          setStatusFilter(val);
          setPage(1);
        }}
        onRowClick={(row) => router.push(`/${locale}/dashboard/orders/${row.id}`)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("deleteOrder")}
        description={t("confirmDeleteOrder")}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </DashboardShell>
  );
}
