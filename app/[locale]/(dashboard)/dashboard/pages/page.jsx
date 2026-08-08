"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DataTable from "@/components/dashboard/DataTable";
import PageContentForm from "@/components/dashboard/PageContentForm";
import TableSkeleton from "@/components/dashboard/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function PagesDashboard() {
  const t = useTranslations("Dashboard");
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState(null);

  const { data: pages = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["pages"],
    queryFn: async () => {
      const res = await fetch("/api/pages");
      if (!res.ok) throw new Error("Failed to fetch pages");
      return res.json();
    },
  });

  const handleEdit = (page) => {
    setEditingPage(page);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingPage(null);
    setDialogOpen(true);
  };

  const handleFormSuccess = () => {
    setDialogOpen(false);
    setEditingPage(null);
    queryClient.invalidateQueries({ queryKey: ["pages"] });
  };

  const columns = [
    {
      header: "الرابط الدائم (Slug)",
      accessorKey: "slug",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-bold border-muted-foreground/30 !h-auto !py-1.5 !px-4 text-sm rounded-full shadow-sm" dir="ltr">
          /{row.slug}
        </Badge>
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
      header: "تاريخ التحديث",
      accessorKey: "updatedAt",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm font-medium">
          {new Date(row.updatedAt).toLocaleDateString("ar-SA", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
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
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <DashboardShell 
        title="الصفحات" 
        description="إدارة محتوى الصفحات الثابتة (من نحن، اتصل بنا، إلخ)"
        action={
          <Button disabled className="gap-2 opacity-50 !px-8 !py-2.5 !w-auto h-11 rounded-xl font-bold shadow-sm">
            <Plus className="h-5 w-5" />
            إضافة صفحة جديدة
          </Button>
        }
      >
        <TableSkeleton rows={3} />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="الصفحات الثابتة"
      description="إدارة محتوى الصفحات الثابتة مثل (من نحن) و (اتصل بنا)"
    >
      <div className="flex justify-end mb-4">
        <Button
          onClick={handleAddNew}
          className="gap-2 !px-8 !py-2.5 !w-auto h-11 rounded-xl font-bold shadow-sm"
        >
          <Plus className="h-5 w-5" />
          إضافة صفحة جديدة
        </Button>
      </div>

      <div className="mt-4">
        <DataTable 
        isError={isError}
        onRetry={refetch}
          columns={columns} 
          data={pages} 
          searchKey={["titleAr", "titleEn", "slug"]}
          searchPlaceholder="ابحث بعنوان الصفحة أو الرابط..."
          itemsPerPage={10}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPage ? "تعديل محتوى الصفحة" : "إضافة صفحة جديدة"}</DialogTitle>
          </DialogHeader>
          <PageContentForm
            page={editingPage}
            onSuccess={handleFormSuccess}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
