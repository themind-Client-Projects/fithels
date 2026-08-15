"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DataTable from "@/components/dashboard/DataTable";
import TableSkeleton from "@/components/dashboard/TableSkeleton";
import BannerForm from "@/components/dashboard/BannerForm";
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
import { Pencil, Trash2, Plus, Image as ImageIcon } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";

export default function BannersPage() {
  const t = useTranslations("Dashboard");
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { data: banners = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["banners"],
    queryFn: async () => {
      const res = await fetch("/api/banners?includeInactive=true");
      if (!res.ok) throw new Error("Failed to fetch banners");
      return res.json();
    },
  });

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingBanner(null);
    setDialogOpen(true);
  };

  const handleFormSuccess = () => {
    setDialogOpen(false);
    setEditingBanner(null);
    queryClient.invalidateQueries({ queryKey: ["banners"] });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/banners/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["banners"] });
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete banner");
      }
    } catch (error) {
      console.error("Failed to delete banner:", error);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const columns = [
    {
      header: "الصورة",
      accessorKey: "image",
      cell: ({ row }) => (
        <div className="relative w-24 h-16 rounded-md overflow-hidden bg-muted">
          {row.image ? (
            <Image
              src={row.image}
              alt={row.titleAr || "Banner"}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
            </div>
          )}
        </div>
      ),
    },
    {
      header: "العنوان",
      accessorKey: "titleAr",
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-foreground text-base">{row.titleAr || "بدون عنوان"}</span>
          <span className="text-xs text-muted-foreground font-medium" dir="ltr">{row.titleEn || "No title"}</span>
        </div>
      ),
    },
    {
      header: "الحالة",
      accessorKey: "isActive",
      cell: ({ row }) => (
        <Badge
          variant={row.isActive ? "outline" : "secondary"}
          className={`font-bold !h-auto !py-1.5 !px-4 text-sm rounded-full shadow-sm ${
            row.isActive
              ? "bg-green-500/10 text-green-600 border-green-500/20"
              : "bg-muted text-muted-foreground border-transparent"
          }`}
        >
          {row.isActive ? "نشط" : "غير نشط"}
        </Badge>
      ),
    },
    {
      header: "الترتيب",
      accessorKey: "order",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-bold border-muted-foreground/30 !h-auto !py-1.5 !px-4 text-sm rounded-full shadow-sm">
          {row.order}
        </Badge>
      ),
    },
    {
      header: "الإجراءات",
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
            <Pencil className="h-4 w-4" />
            تعديل
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
            حذف
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <DashboardShell 
        title="البانرات" 
        description="إدارة البانرات والصور في الصفحة الرئيسية"
        action={
          <Button disabled className="gap-2 opacity-50 !px-8 !py-2.5 !w-auto h-11 rounded-xl font-bold shadow-sm">
            <Plus className="h-5 w-5" />
            إضافة بانر جديد
          </Button>
        }
      >
        <TableSkeleton rows={5} columns={5} firstColumnIsMedia />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="البانرات"
      description="إدارة البانرات والصور في الصفحة الرئيسية"
    >
      <div className="flex justify-end mb-4">
        <Button
          onClick={handleAddNew}
          className="gap-2 !px-8 !py-2.5 !w-auto h-11 rounded-xl font-bold shadow-sm"
        >
          <Plus className="h-5 w-5" />
          إضافة بانر جديد
        </Button>
      </div>

      <div className="mt-4">
        <DataTable 
        isError={isError}
        onRetry={refetch}
          columns={columns} 
          data={banners} 
          searchKey={["titleAr", "titleEn"]}
          searchPlaceholder="ابحث بعنوان البانر..."
          itemsPerPage={10}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBanner ? "تعديل بيانات البانر" : "إضافة بانر جديد"}</DialogTitle>
          </DialogHeader>
          <BannerForm
            banner={editingBanner}
            onSuccess={handleFormSuccess}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="حذف البانر"
        description={`هل أنت متأكد من رغبتك في حذف البانر (${deleteTarget?.titleAr || "بدون عنوان"})؟ لا يمكن التراجع عن هذا الإجراء.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </DashboardShell>
  );
}
