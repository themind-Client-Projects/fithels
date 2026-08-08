"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import DashboardShell from "@/components/dashboard/DashboardShell";
import DataTable from "@/components/dashboard/DataTable";
import ProductForm from "@/components/dashboard/ProductForm";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";
import TableSkeleton from "@/components/dashboard/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Image as ImageIcon } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function ProductsPage() {
  const t = useTranslations("Dashboard");
  const queryClient = useQueryClient();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // React Query for ultra-fast, memory-leak-free data fetching
  const { data: products = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const handleAdd = () => {
    setEditingProduct(null);
    setDialogOpen(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleFormSuccess = () => {
    setDialogOpen(false);
    setEditingProduct(null);
    queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["products"] });
      } else {
        const data = await res.json().catch(() => ({}));
        // Server sends a stable reason so the Arabic dashboard can translate it.
        alert(
          data.reason ? t("deleteBlockedProduct") : data.error || "Failed to delete product"
        );
      }
    } catch (error) {
      console.error("Failed to delete product:", error);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const formatCurrency = (amount) => {
    return `$${Number(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const columns = [
    {
      header: t("image"),
      accessorKey: "images",
      cell: ({ row }) => (
        <div className="h-14 w-14 rounded-xl border border-border/50 bg-muted/30 overflow-hidden flex items-center justify-center shadow-sm">
          {row.images && row.images.length > 0 ? (
            <img
              src={row.images[0]}
              alt={row.titleAr || row.titleEn}
              className="h-full w-full object-cover transition-transform hover:scale-110 duration-300"
            />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
          )}
        </div>
      ),
    },
    {
      header: t("titleAr"),
      accessorKey: "titleAr",
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-foreground text-base">{row.titleAr}</span>
          <span className="text-xs text-muted-foreground font-medium">{row.titleEn}</span>
        </div>
      ),
    },
    {
      header: t("price"),
      accessorKey: "price",
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className={`font-bold text-base ${row.salePrice ? "line-through text-muted-foreground/60 text-sm" : "text-foreground"}`}>
            {formatCurrency(row.price)}
          </span>
          {row.salePrice && (
            <span className="font-bold text-emerald-600 text-base">
              {formatCurrency(row.salePrice)}
            </span>
          )}
        </div>
      ),
    },
    {
      header: t("stock"),
      accessorKey: "stock",
      cell: ({ row }) => (
        row.stock <= 0 ? (
          <Badge variant="destructive" className="font-bold">نفد الكمية</Badge>
        ) : row.stock < 10 ? (
          <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50 font-bold">
            {row.stock} متبقي
          </Badge>
        ) : (
          <span className="font-bold text-foreground text-base">
            {row.stock}
          </span>
        )
      ),
    },
    {
      header: t("category"),
      accessorKey: "category",
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-bold bg-muted text-muted-foreground !h-auto !py-1.5 !px-4 text-sm rounded-full shadow-sm border-transparent">
          {row.category?.nameAr || row.category?.nameEn || "—"}
        </Badge>
      ),
    },
    {
      header: t("status"),
      accessorKey: "isActive",
      cell: ({ row }) =>
        row.isActive ? (
          <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 font-bold shadow-none !h-auto !py-1.5 !px-4 text-sm rounded-full">
            {t("active")}
          </Badge>
        ) : (
          <Badge variant="secondary" className="font-bold !h-auto !py-1.5 !px-4 text-sm rounded-full shadow-sm bg-muted text-muted-foreground border-transparent">
            {t("inactive")}
          </Badge>
        ),
    },
    {
      header: t("actions"),
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
            {t("edit")}
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
            {t("delete")}
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <DashboardShell 
        title={t("products")} 
        description={t("manageProducts")}
        action={
          <Button disabled className="gap-2 opacity-50 !px-8 !py-2.5 !w-auto h-11 rounded-xl font-bold shadow-sm">
            <Plus className="h-5 w-5" />
            {t("addProduct")}
          </Button>
        }
      >
        <TableSkeleton rows={5} />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title={t("products")}
      description={t("manageProducts")}
      action={
        <Button onClick={handleAdd} className="gap-2 !px-8 !py-2.5 !w-auto h-11 rounded-xl font-bold shadow-sm">
          <Plus className="h-5 w-5" />
          {t("addProduct")}
        </Button>
      }
    >
      <div className="mt-4">
        <DataTable 
        isError={isError}
        onRetry={refetch}
          columns={columns} 
          data={products} 
          searchKey={["titleAr", "titleEn", "slug"]}
          searchPlaceholder="ابحث باسم المنتج..."
          itemsPerPage={10}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? t("editProduct") : t("addNewProduct")}
            </DialogTitle>
          </DialogHeader>
          <ProductForm
            product={editingProduct}
            onSuccess={handleFormSuccess}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("deleteProduct")}
        description={t("confirmDeleteProduct", { name: deleteTarget?.titleAr || deleteTarget?.titleEn })}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </DashboardShell>
  );
}
