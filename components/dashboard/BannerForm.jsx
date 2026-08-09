"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function BannerForm({ banner, onSuccess, onCancel }) {
  const t = useTranslations("Dashboard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    titleEn: "",
    titleAr: "",
    btnTextEn: "",
    btnTextAr: "",
    image: "",
    link: "",
    order: 0,
    isActive: true,
  });

  useEffect(() => {
    if (banner) {
      setFormData({
        titleEn: banner.titleEn || "",
        titleAr: banner.titleAr || "",
        btnTextEn: banner.btnTextEn || "",
        btnTextAr: banner.btnTextAr || "",
        image: banner.image || "",
        link: banner.link || "",
        order: banner.order || 0,
        isActive: banner.isActive !== undefined ? banner.isActive : true,
      });
    }
  }, [banner]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = banner?.id ? `/api/banners/${banner.id}` : `/api/banners`;
      const method = banner?.id ? "PUT" : "POST";
      
      const payload = {
        ...formData,
        order: parseInt(formData.order) || 0,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save banner");
      }
    } catch (error) {
      console.error("Error saving banner:", error);
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
          <Label htmlFor="image" className="text-start text-sm font-semibold text-muted-foreground">صورة البانر (URL)</Label>
          <Input
            id="image"
            value={formData.image}
            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            placeholder="/images/banner/example.jpg"
            className="h-12 px-4 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl text-left"
            dir="ltr"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="titleAr" className="text-start text-sm font-semibold text-muted-foreground">العنوان (عربي)</Label>
            <Input
              id="titleAr"
              value={formData.titleAr}
              onChange={(e) => setFormData({ ...formData, titleAr: e.target.value })}
              placeholder="مثال: تشكيلة الصيف"
              className="h-12 px-4 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="titleEn" className="text-start text-sm font-semibold text-muted-foreground">العنوان (إنجليزي)</Label>
            <Input
              id="titleEn"
              value={formData.titleEn}
              onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
              placeholder="e.g: Summer Collection"
              className="h-12 px-4 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl text-left"
              dir="ltr"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="btnTextAr" className="text-start text-sm font-semibold text-muted-foreground">نص الزر (عربي)</Label>
            <Input
              id="btnTextAr"
              value={formData.btnTextAr}
              onChange={(e) => setFormData({ ...formData, btnTextAr: e.target.value })}
              placeholder="تسوق الآن"
              className="h-12 px-4 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="btnTextEn" className="text-start text-sm font-semibold text-muted-foreground">نص الزر (إنجليزي)</Label>
            <Input
              id="btnTextEn"
              value={formData.btnTextEn}
              onChange={(e) => setFormData({ ...formData, btnTextEn: e.target.value })}
              placeholder="Shop Now"
              className="h-12 px-4 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl text-left"
              dir="ltr"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="link" className="text-start text-sm font-semibold text-muted-foreground">الرابط الوجهة</Label>
            <Input
              id="link"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              placeholder="/shop-default-grid"
              className="h-12 px-4 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl text-left"
              dir="ltr"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="order" className="text-start text-sm font-semibold text-muted-foreground">الترتيب</Label>
            <Input
              id="order"
              type="number"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: e.target.value })}
              className="h-12 px-4 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 p-4 bg-muted/20 rounded-xl border border-border/50">
          <div className="space-y-0.5">
            <Label className="text-sm font-bold">تفعيل البانر</Label>
            <p className="text-xs text-muted-foreground">هل ترغب بعرض هذا البانر في الموقع؟</p>
          </div>
          <Switch
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 mt-8 pt-4 border-t border-border/50">
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
          {loading ? "جاري الحفظ..." : "حفظ البانر"}
        </Button>
      </div>
    </form>
  );
}
