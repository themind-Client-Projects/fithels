"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function PageContentForm({ page, onSuccess, onCancel }) {
  const t = useTranslations("Dashboard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    slug: "",
    titleEn: "",
    titleAr: "",
    contentEn: "",
    contentAr: "",
    isActive: true,
  });

  useEffect(() => {
    if (page) {
      setFormData({
        slug: page.slug || "",
        titleEn: page.titleEn || "",
        titleAr: page.titleAr || "",
        contentEn: page.contentEn || "",
        contentAr: page.contentAr || "",
        isActive: page.isActive !== undefined ? page.isActive : true,
      });
    }
  }, [page]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = page?.id ? `/api/pages/${page.slug}` : `/api/pages`;
      const method = page?.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save page content");
      }
    } catch (error) {
      console.error("Error saving page content:", error);
      // Was console-only: a network fault during save showed the admin
      // nothing at all — the button simply re-enabled.
      setError(t("loadFailedDesc"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 font-medium text-start">
          {error}
        </div>
      )}
      <div className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="slug" className="text-start text-sm font-semibold text-muted-foreground">الرابط الدائم (Slug)</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="about"
            className="h-12 px-4 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl text-start"
            dir="ltr"
            disabled={!!page?.id}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="titleAr" className="text-start text-sm font-semibold text-muted-foreground">عنوان الصفحة (عربي)</Label>
            <Input
              id="titleAr"
              value={formData.titleAr}
              onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
              placeholder="من نحن"
              className="h-12 px-4 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="titleEn" className="text-start text-sm font-semibold text-muted-foreground">عنوان الصفحة (إنجليزي)</Label>
            <Input
              id="titleEn"
              value={formData.titleEn}
              onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
              placeholder="About Us"
              className="h-12 px-4 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl text-start"
              dir="ltr"
              required
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="contentAr" className="text-start text-sm font-semibold text-muted-foreground">محتوى الصفحة (عربي)</Label>
          <Textarea
            id="contentAr"
            value={formData.contentAr}
            onChange={(e) => setFormData({ ...formData, contentAr: e.target.value })}
            placeholder="محتوى الصفحة هنا (يدعم HTML)..."
            className="min-h-[150px] p-4 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl leading-relaxed"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="contentEn" className="text-start text-sm font-semibold text-muted-foreground">محتوى الصفحة (إنجليزي)</Label>
          <Textarea
            id="contentEn"
            value={formData.contentEn}
            onChange={(e) => setFormData({ ...formData, contentEn: e.target.value })}
            placeholder="Page content here (supports HTML)..."
            className="min-h-[150px] p-4 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl text-start leading-relaxed"
            dir="ltr"
          />
        </div>

        <div className="mt-2 flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-muted/20 p-4">
          <div className="min-w-0 space-y-0.5">
            <Label className="text-sm font-bold">تفعيل الصفحة</Label>
            <p className="text-xs text-muted-foreground">هل ترغب بعرض هذه الصفحة في الموقع؟</p>
          </div>
          <Switch
            className="shrink-0"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-border/50 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="h-11 !px-8 rounded-xl font-medium !w-auto"
        >
          إلغاء
        </Button>
        <Button 
          type="submit" 
          disabled={loading}
          className="h-11 !px-10 rounded-xl font-bold shadow-sm !w-auto"
        >
          {loading ? "جاري الحفظ..." : "حفظ الصفحة"}
        </Button>
      </div>
    </form>
  );
}
