"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
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

  /**
   * Rows ordered as a tree: each main section, then its own sub-sections.
   *
   * The api sorts by Arabic name, which is right for a flat list and useless
   * for a nested one — "حذاء فلات" could sit ten rows away from the "أحذية" it
   * belongs to, so the shape of the tree was impossible to see. Grouping here
   * rather than in the query keeps one endpoint serving both this page and the
   * product form's pickers.
   */
  const ordered = useMemo(() => {
    const children = new Map();
    for (const row of categories) {
      if (!row.parentId) continue;
      if (!children.has(row.parentId)) children.set(row.parentId, []);
      children.get(row.parentId).push(row);
    }

    const rows = [];
    for (const section of categories.filter((c) => !c.parentId)) {
      rows.push(section);
      for (const child of children.get(section.id) ?? []) rows.push(child);
    }

    // A sub-section whose parent is missing from the list would otherwise
    // vanish from the page entirely.
    const placed = new Set(rows.map((r) => r.id));
    for (const row of categories) if (!placed.has(row.id)) rows.push(row);
    return rows;
  }, [categories]);

  const columns = [
    {
      header: t("nameAr"),
      accessorKey: "nameAr",
      cell: ({ row }) =>
        row.parentId ? (
          // Indented and marked, so a sub-section reads as belonging to the
          // section above it rather than as another row in a flat list.
          <div className="flex items-start gap-2 ps-6">
            {/* An elbow drawn from two borders — the branch joining this row to
                the section above it. Logical sides, so it turns around in
                English without a second rule. */}
            <span
              aria-hidden="true"
              className="mt-2 h-3 w-3 shrink-0 border-b border-s border-muted-foreground/40"
            />
            <div>
              <span className="font-medium">{row.nameAr}</span>
              <span className="block text-xs text-muted-foreground">
                {row.nameEn}
              </span>
            </div>
          </div>
        ) : (
          <div>
            <span className="font-bold">{row.nameAr}</span>
            <span className="block text-xs text-muted-foreground">
              {row.nameEn}
            </span>
          </div>
        ),
    },
    {
      header: t("section"),
      accessorKey: "parentId",
      cell: ({ row }) =>
        row.parentId ? (
          <span className="text-sm text-muted-foreground">
            {row.parent?.nameAr || row.parent?.nameEn || "—"}
          </span>
        ) : (
          <div className="flex flex-col items-start gap-1">
            <Badge variant="outline" className="font-bold">
              {t("mainSection")}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {row._count?.children
                ? t("subSectionsCount", { count: row._count.children })
                : t("noSubSectionsYet")}
            </span>
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
        <TableSkeleton rows={4} columns={4} firstColumnIsMedia />
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
      {/* What the two levels mean, said once on the page rather than left to
          be inferred from the rows. */}
      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        {t("categoriesTreeHint")}
      </p>

      <Card>
        <CardContent className="p-0 sm:p-0">
          <DataTable
            columns={columns}
            data={ordered}
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
