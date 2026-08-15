"use client";

import React, { useState } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DataTable from "@/components/dashboard/DataTable";
import TableSkeleton from "@/components/dashboard/TableSkeleton";
import CouponForm from "@/components/dashboard/CouponForm";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Trash2, Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatMoney } from "@/lib/currency";

const fmtDate = (value) =>
  value ? new Date(value).toLocaleDateString("ar", { year: "numeric", month: "short", day: "numeric" }) : "—";

export default function CouponsPage() {
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["coupons"],
    queryFn: async () => {
      const res = await fetch("/api/coupons?limit=100", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch coupons");
      return res.json();
    },
  });

  const coupons = data?.data ?? [];

  const handleFormSuccess = () => {
    setDialogOpen(false);
    setEditing(null);
    queryClient.invalidateQueries({ queryKey: ["coupons"] });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError("");
    try {
      const res = await fetch(`/api/coupons/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["coupons"] });
        setDeleteTarget(null);
      } else {
        // A coupon with real redemptions cannot be deleted — surface the
        // server's explanation rather than failing silently.
        const body = await res.json().catch(() => ({}));
        setActionError(body.error || "تعذّر حذف الكوبون.");
        setDeleteTarget(null);
      }
    } catch (error) {
      console.error("Failed to delete coupon:", error);
      setActionError("تعذّر الاتصال بالخادم.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      header: "الرمز",
      accessorKey: "code",
      cell: (row) => (
        <span className="font-mono text-base font-bold text-foreground" dir="ltr">
          {row.code}
        </span>
      ),
    },
    {
      header: "الخصم",
      accessorKey: "value",
      cell: (row) => (
        <span className="font-semibold">
          {row.type === "PERCENT" ? `${row.value}%` : formatMoney(row.value, "IQD")}
          {row.type === "PERCENT" && row.maxDiscount
            ? ` (بحد أقصى ${formatMoney(row.maxDiscount, "IQD")})`
            : ""}
        </span>
      ),
    },
    {
      header: "الحد الأدنى للسلة",
      accessorKey: "minSubtotal",
      cell: (row) => (row.minSubtotal ? formatMoney(row.minSubtotal, "IQD") : "—"),
    },
    {
      header: "الاستخدام",
      accessorKey: "redeemedCount",
      cell: (row) => (
        <Badge
          variant="outline"
          className="!h-auto rounded-full border-muted-foreground/30 !px-4 !py-1.5 text-sm font-bold shadow-sm"
        >
          {row.redeemedCount}
          {row.maxRedemptions ? ` / ${row.maxRedemptions}` : " / ∞"}
        </Badge>
      ),
    },
    {
      header: "الصلاحية",
      accessorKey: "expiresAt",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {fmtDate(row.startsAt)} → {fmtDate(row.expiresAt)}
        </span>
      ),
    },
    {
      header: "الحالة",
      accessorKey: "isActive",
      cell: (row) => {
        // "Active" on its own would be misleading for a coupon that has expired
        // or been fully redeemed — the shop rejects those regardless.
        const expired = row.expiresAt && new Date(row.expiresAt) < new Date();
        const exhausted =
          row.maxRedemptions != null && row.redeemedCount >= row.maxRedemptions;
        const label = !row.isActive
          ? "غير نشط"
          : expired
            ? "منتهي"
            : exhausted
              ? "مستنفد"
              : "نشط";
        const usable = row.isActive && !expired && !exhausted;
        return (
          <Badge
            variant={usable ? "outline" : "secondary"}
            className={
              usable
                ? "border-green-500/20 bg-green-500/10 text-green-600"
                : "border-transparent bg-muted text-muted-foreground"
            }
          >
            {label}
          </Badge>
        );
      },
    },
    {
      header: "إجراءات",
      accessorKey: "actions",
      cell: (row) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setEditing(row);
              setDialogOpen(true);
            }}
            className="!h-auto !w-auto gap-2 rounded-xl !px-6 !py-2.5 text-sm font-semibold shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
          >
            <Pencil className="h-4 w-4" />
            تعديل
          </Button>
          <Button
            variant="outline"
            onClick={() => setDeleteTarget(row)}
            className="!h-auto !w-auto gap-2 rounded-xl border border-red-200 bg-red-50 !px-6 !py-2.5 text-sm font-semibold text-red-600 shadow-sm hover:bg-red-100 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
            حذف
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <DashboardShell title="كوبونات الخصم" description="إنشاء أكواد الخصم وإدارتها">
        <TableSkeleton rows={5} columns={7} />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="كوبونات الخصم" description="إنشاء أكواد الخصم وإدارتها">
      {actionError && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-start text-sm font-medium text-red-600"
        >
          {actionError}
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          className="!w-auto h-11 gap-2 rounded-xl !px-8 !py-2.5 font-bold shadow-sm"
        >
          <Plus className="h-5 w-5" />
          إضافة كوبون
        </Button>
      </div>

      <div className="mt-4">
        <DataTable
          isError={isError}
          onRetry={refetch}
          columns={columns}
          data={coupons}
          searchKey={["code"]}
          searchPlaceholder="ابحث برمز الكوبون..."
          itemsPerPage={10}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{editing ? `تعديل الكوبون ${editing.code}` : "إضافة كوبون جديد"}</DialogTitle>
          </DialogHeader>
          <CouponForm
            coupon={editing}
            onSuccess={handleFormSuccess}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="حذف الكوبون"
        description={`هل أنت متأكد من حذف الكوبون (${deleteTarget?.code || ""})؟ الكوبونات المستخدمة في طلبات حقيقية لا يمكن حذفها — عطّليها بدلاً من ذلك.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </DashboardShell>
  );
}
