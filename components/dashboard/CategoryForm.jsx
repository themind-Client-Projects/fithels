"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
// Shared with products: the local version used \w, which is ASCII-only, so an
// Arabic name produced an empty slug and the required field blocked the save.
import { slugify } from "@/lib/products/slug";


export default function CategoryForm({ category, onSuccess, onCancel }) {
  const isEditing = !!category;
  const t = useTranslations("Dashboard");

  const [nameEn, setNameEn] = useState(category?.nameEn || "");
  const [nameAr, setNameAr] = useState(category?.nameAr || "");
  // Controlled so validation can reveal the tab with the missing field.
  const [activeTab, setActiveTab] = useState("en");
  const [slug, setSlug] = useState(category?.slug || "");
  const [autoSlug, setAutoSlug] = useState(!isEditing);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (autoSlug && nameEn) {
      setSlug(slugify(nameEn));
    }
  }, [nameEn, autoSlug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Inactive tab panels unmount, so `required` on nameAr never reaches the
    // DOM. Validate both languages here instead of relying on the browser.
    if (!nameEn.trim()) { setActiveTab('en'); setError(t('requiredEnName')); return; }
    if (!nameAr.trim()) { setActiveTab('ar'); setError(t('requiredArName')); return; }
    setError("");
    setLoading(true);

    const body = { nameEn, nameAr, slug };

    try {
      const url = isEditing
        ? `/api/categories/${category.id}`
        : "/api/categories";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        return;
      }

      onSuccess?.();
    } catch (err) {
      setError(t("uploadError.GENERIC"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="en">English</TabsTrigger>
          <TabsTrigger value="ar">العربية</TabsTrigger>
        </TabsList>
        <TabsContent value="en" className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="nameEn">{t("nameEn")}</Label>
            <Input
              id="nameEn"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="Category name in English"
              required
            />
          </div>
        </TabsContent>
        <TabsContent value="ar" className="space-y-4 mt-4">
          <div className="space-y-2" dir="rtl">
            <Label htmlFor="nameAr">{t("nameAr")}</Label>
            <Input
              id="nameAr"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="اسم الفئة بالعربية"
              required
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="space-y-2">
        <Label htmlFor="slug">{t("slug")}</Label>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setAutoSlug(false);
          }}
          placeholder="category-slug"
          required
        />
        <p className="text-xs text-gray-400">
          Auto-generated from English name. Edit to customize.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("cancel")}
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading
            ? t("saving")
            : isEditing
            ? t("updateCategory")
            : t("createCategory")}
        </Button>
      </div>
    </form>
  );
}
