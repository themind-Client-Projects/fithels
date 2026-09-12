"use client";

import React, { useState, useEffect } from "react";
import ColorField from "@/components/dashboard/ColorField";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import {
  BANNER_PLACEMENTS,
  DEFAULT_BANNER_PLACEMENT,
} from "@/lib/banners/placement";

export default function BannerForm({ banner, onSuccess, onCancel }) {
  const t = useTranslations("Dashboard");
  const [loading, setLoading] = useState(false);
  /**
   * WHICH field is uploading, not merely that one is.
   *
   * A shared boolean put both uploaders into their loading state at once, so
   * picking a video greyed out the image slot as well — the same trap the
   * per-colour product uploader had.
   */
  const [uploading, setUploading] = useState(null);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    titleEn: "",
    titleAr: "",
    btnTextEn: "",
    btnTextAr: "",
    subtitleEn: "",
    subtitleAr: "",
    image: "",
    link: "",
    order: 0,
    textColor: null,
    video: "",
    isActive: true,
    placement: DEFAULT_BANNER_PLACEMENT,
  });

  useEffect(() => {
    if (banner) {
      setFormData({
        titleEn: banner.titleEn || "",
        titleAr: banner.titleAr || "",
        btnTextEn: banner.btnTextEn || "",
        btnTextAr: banner.btnTextAr || "",
        subtitleEn: banner.subtitleEn || "",
        subtitleAr: banner.subtitleAr || "",
        image: banner.image || "",
        link: banner.link || "",
        order: banner.order || 0,
        textColor: banner.textColor ?? null,
        video: banner.video || "",
        isActive: banner.isActive !== undefined ? banner.isActive : true,
        placement: banner.placement || DEFAULT_BANNER_PLACEMENT,
      });
    }
  }, [banner]);

  /** Same contract as the product uploader: POST /api/upload → { url }. */
  /**
   * @param field  which form field receives the URL — "image" or "video"
   * @param kind   "video" raises the server's size ceiling for THIS request
   *               only, so the image uploaders cannot be handed a 40 MB file.
   */
  const handleFileUpload = async (e, field = "image", kind = "image") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(field);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      if (kind === "video") body.append("kind", "video");
      const res = await fetch("/api/upload", { method: "POST", body });

      if (!res.ok) {
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
      if (typeof data?.url !== "string" || !data.url) {
        throw new Error(t("uploadError.GENERIC"));
      }
      setFormData((prev) => ({ ...prev, [field]: data.url }));
    } catch (err) {
      console.error(err);
      setError(err?.message || t("uploadError.GENERIC"));
    } finally {
      setUploading(null);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // The image input is a file picker now, so `required` cannot guard it.
    if (!formData.image) {
      setError("الرجاء رفع صورة للبانر.");
      return;
    }

    setLoading(true);
    try {
      const url = banner?.id ? `/api/banners/${banner.id}` : `/api/banners`;
      const method = banner?.id ? "PUT" : "POST";
      
      const payload = {
        ...formData,
        order: parseInt(formData.order) || 0,
        textColor: formData.textColor || null,
        video: formData.video || null,
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
          <Label className="text-start text-sm font-semibold text-muted-foreground">صورة البانر</Label>
          {/* Upload, not a URL field. Typing a path meant a banner could point
              at a file that was never deployed — the slide then rendered as a
              blank hero, which is exactly how the carousel went missing. */}
          {formData.image ? (
            <div className="relative w-full overflow-hidden rounded-xl border border-border">
              <Image
                src={formData.image}
                alt={formData.titleAr || "banner"}
                width={1920}
                height={600}
                className="h-40 w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, image: "" }))}
                className="absolute top-2 end-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                aria-label="إزالة الصورة"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="flex h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 text-muted-foreground transition-colors hover:bg-muted/40">
              {uploading === "image" ? (
                <span className="text-sm">جاري الرفع…</span>
              ) : (
                <>
                  <Upload size={22} />
                  <span className="text-sm font-medium">اختر صورة للبانر</span>
                  <span className="text-xs">JPEG أو PNG أو WebP · حتى 5 ميغابايت</span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                className="hidden"
                disabled={Boolean(uploading)}
                onChange={(e) => handleFileUpload(e, "image", "image")}
              />
            </label>
          )}
        </div>

        {/* Optional video. The image above stays required and is what shows
            while this is still arriving — and what shows instead of it if the
            browser cannot play the file — so a banner is never blank. */}
        <div className="grid gap-2">
          <Label className="text-start text-sm font-semibold text-muted-foreground">
            فيديو البانر (اختياري)
          </Label>
          {formData.video ? (
            <div className="relative w-full overflow-hidden rounded-xl border border-border">
              {/* Muted and loops here too, so the preview behaves the way the
                  storefront will rather than being a still to guess from. */}
              <video
                src={formData.video}
                poster={formData.image || undefined}
                className="h-40 w-full object-cover"
                muted
                loop
                autoPlay
                playsInline
              />
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, video: "" }))}
                className="absolute top-2 end-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
                aria-label="إزالة الفيديو"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 text-muted-foreground transition-colors hover:bg-muted/40">
              {uploading === "video" ? (
                <span className="text-sm">جاري رفع الفيديو…</span>
              ) : (
                <>
                  <Upload size={20} />
                  <span className="text-sm font-medium">اختر فيديو للبانر</span>
                  <span className="text-xs">MP4 أو WebM · حتى ٤٠ ميغابايت</span>
                </>
              )}
              <input
                type="file"
                accept="video/mp4,video/webm"
                className="hidden"
                disabled={Boolean(uploading)}
                onChange={(e) => handleFileUpload(e, "video", "video")}
              />
            </label>
          )}
          <p className="text-xs text-muted-foreground">
            يُعرض الفيديو تلقائيًا وبلا صوت فوق الصورة. الصورة تبقى ظاهرة حتى
            يبدأ الفيديو، وتظل هي البديل إن تعذّر تشغيله. اختصر المقطع قدر
            الإمكان — يُحمّل على بيانات الزائر.
          </p>
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
              className="h-12 px-4 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl text-start"
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
              className="h-12 px-4 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl text-start"
              dir="ltr"
            />
          </div>
        </div>

        {/* Only the feature panel renders the kicker line today, so both fields
            are optional and blank is stored as NULL. */}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="subtitleAr" className="text-start text-sm font-semibold text-muted-foreground">{t("subtitleAr")}</Label>
            <Input
              id="subtitleAr"
              value={formData.subtitleAr}
              onChange={(e) => setFormData({ ...formData, subtitleAr: e.target.value })}
              placeholder="حصري"
              className="h-12 px-4 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="subtitleEn" className="text-start text-sm font-semibold text-muted-foreground">{t("subtitleEn")}</Label>
            <Input
              id="subtitleEn"
              value={formData.subtitleEn}
              onChange={(e) => setFormData({ ...formData, subtitleEn: e.target.value })}
              placeholder="Exclusive"
              className="h-12 px-4 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl text-start"
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
              className="h-12 px-4 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl text-start"
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
              // Digits read left-to-right. Without this the number sat against
              // the opposite edge from the URL field beside it in the same row.
              dir="ltr"
              className="h-12 px-4 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl text-start"
            />
          </div>
        </div>

        {/* The banner is words laid over a photograph, and they were always
            white — so a pale image swallowed them. Only the shop has seen the
            photo, so only the shop can say what the words need to be. */}
        <ColorField
          label="لون النص على الصورة"
          hint="يُطبَّق على العنوان والسطر العلوي وزر البانر. اتركه فارغًا للأبيض."
          value={formData.textColor}
          onChange={(hex) => setFormData({ ...formData, textColor: hex })}
        />

        {/* Which part of the home page this banner belongs to. Buttons rather
            than a select: there are only three, and seeing all of them makes it
            obvious that the catalogue panels are editable at all — they were
            hardcoded in the component before this existed.
            type="button" matters — a bare <button> inside a form submits it. */}
        <div className="grid gap-2">
          <Label className="text-start text-sm font-semibold text-muted-foreground">
            {t("placement")}
          </Label>
          <div className="flex flex-wrap gap-2">
            {BANNER_PLACEMENTS.map((value) => {
              const active = formData.placement === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormData({ ...formData, placement: value })}
                  aria-pressed={active}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted/30 text-foreground hover:bg-muted"
                  }`}
                >
                  {t(`placement${value}`)}
                </button>
              );
            })}
          </div>
          <p className="text-start text-xs text-muted-foreground">
            {t("placementHint")}
          </p>
        </div>

        <div className="mt-2 flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-muted/20 p-4">
          <div className="min-w-0 space-y-0.5">
            <Label className="text-sm font-bold">تفعيل البانر</Label>
            <p className="text-xs text-muted-foreground">هل ترغب بعرض هذا البانر في الموقع؟</p>
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
          {loading ? "جاري الحفظ..." : "حفظ البانر"}
        </Button>
      </div>
    </form>
  );
}
