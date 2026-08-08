"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DataTable from "@/components/dashboard/DataTable";
import TableSkeleton from "@/components/dashboard/TableSkeleton";
import CustomerForm from "@/components/dashboard/CustomerForm";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Trash2, UserCog, ShieldCheck, ShieldAlert } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function CustomersPage() {
  const t = useTranslations("Dashboard");
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { data: customers = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setDialogOpen(true);
  };

  const handleFormSuccess = () => {
    setDialogOpen(false);
    setEditingCustomer(null);
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/customers/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["customers"] });
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete customer");
      }
    } catch (error) {
      console.error("Failed to delete customer:", error);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("ar-SA", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const ALL_ROLES = [
    { value: "ADMIN", label: "مدير (Admin)" },
    { value: "EMPLOYEE", label: "موظف (Employee)" },
    { value: "CUSTOMER", label: "عميل (Customer)" },
  ];

  const columns = [
    {
      header: t("name") || "الاسم",
      accessorKey: "name",
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-foreground text-base">{row.name || "—"}</span>
          <span className="text-xs text-muted-foreground font-medium">{row.email}</span>
        </div>
      ),
    },
    {
      header: "الدور / الصلاحية",
      accessorKey: "role",
      cell: ({ row }) => {
        if (row.role === "ADMIN") {
          return (
            <Badge className="bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-purple-500/20 font-bold shadow-none gap-1.5 !h-auto !py-1.5 !px-4 text-sm rounded-full">
              <ShieldAlert className="h-4 w-4" /> مدير
            </Badge>
          );
        }
        if (row.role === "EMPLOYEE") {
          return (
            <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20 font-bold shadow-none gap-1.5 !h-auto !py-1.5 !px-4 text-sm rounded-full">
              <ShieldCheck className="h-4 w-4" /> موظف
            </Badge>
          );
        }
        return (
          <Badge variant="secondary" className="font-bold bg-muted text-muted-foreground !h-auto !py-1.5 !px-4 text-sm rounded-full">
            عميل
          </Badge>
        );
      },
    },
    {
      header: t("phone") || "رقم الهاتف",
      accessorKey: "phone",
      cell: ({ row }) => (
        <span className="text-muted-foreground font-medium" dir="ltr">{row.phone || "—"}</span>
      ),
    },
    {
      header: t("ordersCount") || "عدد الطلبات",
      accessorKey: "_count",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-bold border-muted-foreground/30 !h-auto !py-1.5 !px-4 text-sm rounded-full shadow-sm">
          {row._count?.orders || 0} طلبات
        </Badge>
      ),
    },
    {
      header: t("joined") || "تاريخ الانضمام",
      accessorKey: "createdAt",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm font-medium">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      header: t("actions") || "الإجراءات",
      accessorKey: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row);
            }}
            className="!h-auto !py-2.5 !px-6 !w-auto text-sm font-semibold gap-2 rounded-xl hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all shadow-sm"
          >
            <UserCog className="h-4 w-4" />
            تعديل الصلاحية
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTarget(row);
            }}
            className="!h-auto !py-2.5 !px-6 !w-auto text-sm font-semibold gap-2 rounded-xl shadow-sm bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-red-200 border"
          >
            <Trash2 className="h-4 w-4" />
            {t("delete") || "حذف"}
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <DashboardShell title={t("customers") || "العملاء"} description={t("viewCustomers") || "إدارة العملاء والصلاحيات"}>
        <TableSkeleton rows={5} />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title={t("customers") || "العملاء"}
      description={t("viewCustomers") || "إدارة العملاء والصلاحيات"}
    >
      <div className="mt-4">
        <DataTable 
        isError={isError}
        onRetry={refetch}
          columns={columns} 
          data={customers} 
          searchKey={["name", "email", "phone"]}
          searchPlaceholder="ابحث باسم المستخدم أو رقم الهاتف..."
          filterKey="role"
          filterOptions={ALL_ROLES}
          filterPlaceholder="تصفية حسب الصلاحية"
          itemsPerPage={10}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
          </DialogHeader>
          <CustomerForm
            customer={editingCustomer}
            onSuccess={handleFormSuccess}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("delete") || "حذف المستخدم"}
        description={`هل أنت متأكد من رغبتك في حذف المستخدم ${deleteTarget?.name || deleteTarget?.email}؟ لا يمكن التراجع عن هذا الإجراء.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </DashboardShell>
  );
}
