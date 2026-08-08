"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Image from "next/image";

export default function ProductForm({ product, onSuccess, onCancel }) {
  const isEditing = !!product;
  const t = useTranslations("Dashboard");

  const [titleEn, setTitleEn] = useState(product?.titleEn || "");
  const [titleAr, setTitleAr] = useState(product?.titleAr || "");
  const [descEn, setDescEn] = useState(product?.descEn || "");
  const [descAr, setDescAr] = useState(product?.descAr || "");
  const [price, setPrice] = useState(product?.price?.toString() || "");
  const [salePrice, setSalePrice] = useState(product?.salePrice?.toString() || "");
  const [categoryId, setCategoryId] = useState(product?.categoryId || "");
  const [sizes, setSizes] = useState(product?.sizes?.join(", ") || "");
  const [colors, setColors] = useState(product?.colors?.join(", ") || "");
  const [stock, setStock] = useState(product?.stock?.toString() || "0");
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [images, setImages] = useState(product?.images || []);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  // Controlled so validation can switch to the tab holding the missing field.
  const [activeTab, setActiveTab] = useState("en");

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data);
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    }
    fetchCategories();
  }, []);

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError("");

    const newImages = [...images];
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          // Say what actually went wrong. This used to blame Supabase config
          // for every failure, sending admins to debug the wrong thing when the
          // real answer was "too large" or "not an image".
          const reason =
            res.status === 413
              ? "TOO_LARGE"
              : res.status === 415
                ? "UNSUPPORTED_TYPE"
                : res.status === 401 || res.status === 403
                  ? "UNAUTHORIZED"
                  : "GENERIC";
          throw new Error(t(`uploadError.${reason}`));
        }

        const data = await res.json();
        newImages.push(data.url);
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || t("uploadError.GENERIC"));
    } finally {
      // Keep whatever uploaded before the failure — those files are already in
      // storage, and dropping them here orphaned them and lost the admin's work.
      setImages(newImages);
      setUploading(false);
      // Allow re-selecting the same file after a failure.
      e.target.value = "";
    }
  };

  const removeImage = (indexToRemove) => {
    setImages(images.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // The language tabs unmount when inactive, so `required` on the Arabic
    // fields is not in the DOM and the browser never enforces it. An admin who
    // filled only the English tab got a server-side "Missing required fields"
    // naming nothing, for a field on a tab they could not see. Validate both
    // languages here and switch to the offending tab.
    if (!titleEn.trim()) {
      setActiveTab("en");
      setError(t("requiredEnTitle"));
      return;
    }
    if (!titleAr.trim()) {
      setActiveTab("ar");
      setError(t("requiredArTitle"));
      return;
    }

    setLoading(true);

    const body = {
      titleEn,
      titleAr,
      descEn,
      descAr,
      price,
      salePrice: salePrice || null,
      categoryId,
      sizes: sizes
        ? sizes.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      colors: colors
        ? colors.split(",").map((c) => c.trim()).filter(Boolean)
        : [],
      stock,
      isActive,
      images,
    };

    try {
      const url = isEditing ? `/api/products/${product.id}` : "/api/products";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Server sends a stable `reason` so this Arabic-first dashboard can show
        // a translated message instead of the English fallback.
        setError(
          data.reason
            ? t(`pricingError.${data.reason}`)
            : data.error || t("uploadError.GENERIC")
        );
        return;
      }

      onSuccess?.();
    } catch (err) {
      setError("Failed to save product");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 py-4">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 font-medium text-start">
          {error}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 p-1.5 bg-muted/40 rounded-xl h-14 mb-2">
          <TabsTrigger value="en" className="rounded-lg font-semibold text-sm py-2">English</TabsTrigger>
          <TabsTrigger value="ar" className="rounded-lg font-semibold text-sm py-2">العربية</TabsTrigger>
        </TabsList>
        <TabsContent value="en" className="flex flex-col gap-6 mt-6">
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="titleEn" className="text-start text-sm font-bold text-foreground">{t("titleEn")}</Label>
            <Input
              id="titleEn"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder="Product title in English"
              className="h-12 !px-4 !text-start bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl"
              required
            />
          </div>
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="descEn" className="text-start text-sm font-bold text-foreground">{t("descEn")}</Label>
            <Textarea
              id="descEn"
              value={descEn}
              onChange={(e) => setDescEn(e.target.value)}
              placeholder="Product description in English"
              className="!px-4 !text-start py-3 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl"
              rows={3}
            />
          </div>
        </TabsContent>
        <TabsContent value="ar" className="flex flex-col gap-6 mt-6">
          <div className="flex flex-col gap-2.5" dir="rtl">
            <Label htmlFor="titleAr" className="text-start text-sm font-bold text-foreground">{t("titleAr")}</Label>
            <Input
              id="titleAr"
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              placeholder="عنوان المنتج بالعربية"
              className="h-12 !px-4 !text-start bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl"
              required
            />
          </div>
          <div className="flex flex-col gap-2.5" dir="rtl">
            <Label htmlFor="descAr" className="text-start text-sm font-bold text-foreground">{t("descAr")}</Label>
            <Textarea
              id="descAr"
              value={descAr}
              onChange={(e) => setDescAr(e.target.value)}
              placeholder="وصف المنتج بالعربية"
              className="!px-4 !text-start py-3 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl"
              rows={3}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Images Section */}
      <div className="flex flex-col gap-3.5">
        <Label className="text-start text-sm font-bold text-foreground">{t("images") || "Product Images"}</Label>
        
        <div className="flex flex-wrap gap-4">
          {images.map((img, idx) => (
            <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border">
              <Image src={img} alt={`Product image ${idx}`} fill style={{ objectFit: 'cover' }} />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-80 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
          
          <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {uploading ? (
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span className="text-2xl text-muted-foreground">+</span>
              )}
            </div>
            <input 
              type="file" 
              className="hidden" 
              accept="image/*" 
              multiple 
              onChange={handleFileUpload} 
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-2.5">
          <Label htmlFor="price" className="text-start text-sm font-bold text-foreground">{t("price")} ($)</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            className="h-12 !px-4 !text-start bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl"
            required
          />
        </div>
        <div className="flex flex-col gap-2.5">
          <Label htmlFor="salePrice" className="text-start text-sm font-bold text-foreground">{t("salePrice")} ($)</Label>
          <Input
            id="salePrice"
            type="number"
            step="0.01"
            min="0"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            placeholder="Optional"
            className="h-12 !px-4 !text-start bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <Label htmlFor="categoryId" className="text-start text-sm font-bold text-foreground">{t("category")}</Label>
        <select
          id="categoryId"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="flex h-12 w-full rounded-xl border border-input bg-muted/30 px-4 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-primary/20 transition-all"
          required
        >
          <option value="">{t("selectCategory")}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.nameAr || cat.nameEn}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-2.5">
          <Label htmlFor="sizes" className="text-start text-sm font-bold text-foreground">{t("sizes")}</Label>
          <Input
            id="sizes"
            value={sizes}
            onChange={(e) => setSizes(e.target.value)}
            placeholder="S, M, L, XL"
            className="h-12 !px-4 !text-start bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl"
          />
        </div>
        <div className="flex flex-col gap-2.5">
          <Label htmlFor="colors" className="text-start text-sm font-bold text-foreground">{t("colors")}</Label>
          <Input
            id="colors"
            value={colors}
            onChange={(e) => setColors(e.target.value)}
            placeholder="Red, Blue, Black"
            className="h-12 !px-4 !text-start bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <Label htmlFor="stock" className="text-start text-sm font-bold text-foreground">{t("stock")}</Label>
        <Input
          id="stock"
          type="number"
          min="0"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          placeholder="0"
          className="h-12 !px-4 !text-start bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl"
        />
      </div>

      <div className="flex items-center gap-4 py-2">
        <Switch
          checked={isActive}
          onCheckedChange={setIsActive}
          id="isActive"
        />
        <Label htmlFor="isActive" className="text-sm font-bold text-foreground cursor-pointer">{t("isActive")}</Label>
      </div>

      <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-border/50">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} className="h-11 !px-8 rounded-xl font-medium !w-auto">
            إلغاء
          </Button>
        )}
        <Button type="submit" disabled={loading} className="h-11 !px-10 rounded-xl font-bold shadow-sm !w-auto">
          {loading
            ? "جاري الحفظ..."
            : isEditing
            ? "تحديث المنتج"
            : "إضافة المنتج"}
        </Button>
      </div>
    </form>
  );
}
