"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DataTable from "@/components/dashboard/DataTable";
import TableSkeleton from "@/components/dashboard/TableSkeleton";
import CategoryForm from "@/components/dashboard/CategoryForm";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";

export default function CategoriesPage() {
  const t = useTranslations("Dashboard");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const fetchCategories = useCallback(async () => {
    // A silent catch here meant a failed load rendered as "no categories" —
    // the last list still missing the error state the other five now have.
    setLoadError(false);
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAdd = () => {
    setEditingCategory(null);
    setDialogOpen(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setDialogOpen(true);
  };

  const handleFormSuccess = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    fetchCategories();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/categories/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchCategories();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete category");
      }
    } catch (error) {
      console.error("Failed to delete category:", error);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const columns = [
    {
      header: t("nameAr"),
      accessorKey: "nameAr",
      cell: ({ row }) => (
        <div>
          <span className="font-medium">{row.nameAr}</span>
          <span className="block text-xs text-muted-foreground">{row.nameEn}</span>
        </div>
      ),
    },
    {
      header: t("slug"),
      accessorKey: "slug",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{row.slug}</span>
      ),
    },
    {
      header: t("productsCount"),
      accessorKey: "_count",
      cell: ({ row }) => (
        <Badge variant="secondary">{row._count?.products || 0}</Badge>
      ),
    },
    {
      header: t("actions"),
      accessorKey: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row);
            }}
            className="!h-auto !py-2.5 !px-6 !w-auto text-sm font-semibold gap-2 rounded-xl hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all shadow-sm"
          >
            <Pencil className="h-3.5 w-3.5" />
            {t("edit")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              if ((row._count?.products || 0) > 0) {
                alert(t("cannotDeleteCategory", { name: row.nameAr, count: row._count.products }));
                return;
              }
              setDeleteTarget(row);
            }}
            className="!h-auto !py-2.5 !px-6 !w-auto text-sm font-semibold gap-2 rounded-xl shadow-sm bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-red-200 border"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("delete")}
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <DashboardShell 
        title={t("categories")} 
        description={t("manageCategories")}
        action={
          <Button disabled className="gap-2 opacity-50 !px-8 !py-2.5 !w-auto h-11 rounded-xl font-bold shadow-sm">
            <Plus className="h-5 w-5" />
            {t("addCategory")}
          </Button>
        }
      >
        <TableSkeleton rows={4} />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title={t("categories")}
      description={t("manageCategories")}
      action={
        <Button onClick={handleAdd} className="gap-2 !px-8 !py-2.5 !w-auto h-11 rounded-xl font-bold shadow-sm">
          <Plus className="h-5 w-5" />
          {t("addCategory")}
        </Button>
      }
    >
      <Card>
        <CardContent className="p-0 sm:p-0">
          <DataTable
            columns={columns}
            data={categories}
            isError={loadError}
            onRetry={fetchCategories}
          />
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? t("editCategory") : t("addNewCategory")}
            </DialogTitle>
          </DialogHeader>
          <CategoryForm
            category={editingCategory}
            onSuccess={handleFormSuccess}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("deleteCategory")}
        description={t("confirmDeleteCategory", { name: deleteTarget?.nameAr || deleteTarget?.nameEn })}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </DashboardShell>
  );
}
