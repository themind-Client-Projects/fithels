"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/** `2026-08-12T09:30` for a datetime-local input, or "" when unset. */
const toLocalInput = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const EMPTY = {
  code: "",
  type: "PERCENT",
  value: "",
  minSubtotal: "",
  maxDiscount: "",
  startsAt: "",
  expiresAt: "",
  maxRedemptions: "",
  maxPerUser: "1",
  isActive: true,
};

export default function CouponForm({ coupon, onSuccess, onCancel }) {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");

  useEffect(() => {
    if (!coupon) {
      setForm(EMPTY);
      return;
    }
    setForm({
      code: coupon.code ?? "",
      type: coupon.type ?? "PERCENT",
      value: coupon.value?.toString() ?? "",
      minSubtotal: coupon.minSubtotal?.toString() ?? "",
      maxDiscount: coupon.maxDiscount?.toString() ?? "",
      startsAt: toLocalInput(coupon.startsAt),
      expiresAt: toLocalInput(coupon.expiresAt),
      maxRedemptions: coupon.maxRedemptions?.toString() ?? "",
      maxPerUser: coupon.maxPerUser?.toString() ?? "",
      isActive: coupon.isActive ?? true,
    });
  }, [coupon]);

  const set = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFieldError("");

    try {
      const url = coupon?.id ? `/api/coupons/${coupon.id}` : "/api/coupons";
      const res = await fetch(url, {
        method: coupon?.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        // Empty strings mean "no limit"; the API turns them into null. Sending
        // "" as a number would otherwise be read as 0 — a coupon nobody can use.
        body: JSON.stringify(form),
      });

      if (res.ok) {
        onSuccess();
        return;
      }

      const data = await res.json().catch(() => ({}));
      setError(data.error || "تعذّر حفظ الكوبون.");
      setFieldError(data.field || "");
    } catch (err) {
      console.error("Failed to save coupon:", err);
      setError("تعذّر الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const invalid = (field) =>
    fieldError === field ? "border-red-400 focus-visible:ring-red-200" : "";

  const inputClass =
    "h-12 px-4 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-start text-sm font-medium text-red-600"
        >
          {error}
        </div>
      )}

      <div className="grid gap-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="code" className="text-start text-sm font-semibold text-muted-foreground">
              الرمز
            </Label>
            <Input
              id="code"
              value={form.code}
              // Upper-cased as it is typed so the admin sees exactly what the
              // shopper will need to enter.
              onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
              placeholder="SUMMER20"
              dir="ltr"
              required
              className={`${inputClass} text-start ${invalid("code")}`}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="type" className="text-start text-sm font-semibold text-muted-foreground">
              نوع الخصم
            </Label>
            <select
              id="type"
              value={form.type}
              onChange={set("type")}
              className={`${inputClass} w-full border border-input`}
            >
              <option value="PERCENT">نسبة مئوية (%)</option>
              <option value="FIXED">مبلغ ثابت ($)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="value" className="text-start text-sm font-semibold text-muted-foreground">
              {form.type === "PERCENT" ? "النسبة (1–100)" : "المبلغ بالدولار"}
            </Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              min="0"
              max={form.type === "PERCENT" ? "100" : undefined}
              value={form.value}
              onChange={set("value")}
              required
              className={`${inputClass} ${invalid("value")}`}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="maxDiscount" className="text-start text-sm font-semibold text-muted-foreground">
              أقصى خصم ($) — اختياري
            </Label>
            <Input
              id="maxDiscount"
              type="number"
              step="0.01"
              min="0"
              value={form.maxDiscount}
              onChange={set("maxDiscount")}
              placeholder="بدون حد"
              // Only meaningful for a percentage: a fixed amount is its own cap.
              disabled={form.type !== "PERCENT"}
              className={`${inputClass} ${invalid("maxDiscount")}`}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="minSubtotal" className="text-start text-sm font-semibold text-muted-foreground">
              أقل مجموع للسلة ($) — اختياري
            </Label>
            <Input
              id="minSubtotal"
              type="number"
              step="0.01"
              min="0"
              value={form.minSubtotal}
              onChange={set("minSubtotal")}
              placeholder="بدون حد أدنى"
              className={`${inputClass} ${invalid("minSubtotal")}`}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="maxPerUser" className="text-start text-sm font-semibold text-muted-foreground">
              مرات الاستخدام لكل زبونة
            </Label>
            <Input
              id="maxPerUser"
              type="number"
              min="1"
              value={form.maxPerUser}
              onChange={set("maxPerUser")}
              placeholder="بدون حد"
              className={`${inputClass} ${invalid("maxPerUser")}`}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="maxRedemptions" className="text-start text-sm font-semibold text-muted-foreground">
              إجمالي مرات الاستخدام — اختياري
            </Label>
            <Input
              id="maxRedemptions"
              type="number"
              min="1"
              value={form.maxRedemptions}
              onChange={set("maxRedemptions")}
              placeholder="بدون حد"
              className={`${inputClass} ${invalid("maxRedemptions")}`}
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-start text-sm font-semibold text-muted-foreground">
              استُخدم حتى الآن
            </Label>
            <div className="flex h-12 items-center rounded-xl bg-muted/20 px-4 text-sm font-bold">
              {coupon?.redeemedCount ?? 0}
              {coupon?.maxRedemptions ? ` / ${coupon.maxRedemptions}` : ""}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="startsAt" className="text-start text-sm font-semibold text-muted-foreground">
              يبدأ في — اختياري
            </Label>
            <Input
              id="startsAt"
              type="datetime-local"
              value={form.startsAt}
              onChange={set("startsAt")}
              className={`${inputClass} ${invalid("startsAt")}`}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="expiresAt" className="text-start text-sm font-semibold text-muted-foreground">
              ينتهي في — اختياري
            </Label>
            <Input
              id="expiresAt"
              type="datetime-local"
              value={form.expiresAt}
              onChange={set("expiresAt")}
              className={`${inputClass} ${invalid("expiresAt")}`}
            />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-muted/20 p-4">
          <div className="min-w-0 space-y-0.5">
            <Label className="text-sm font-bold">تفعيل الكوبون</Label>
            <p className="text-xs text-muted-foreground">
              الكوبون المعطّل يُرفض عند الدفع فوراً.
            </p>
          </div>
          <Switch
            className="shrink-0"
            checked={form.isActive}
            onCheckedChange={(checked) => setForm((p) => ({ ...p, isActive: checked }))}
          />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-end gap-3 border-t border-border/50 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="!w-auto h-11 rounded-xl !px-8 font-medium"
        >
          إلغاء
        </Button>
        <Button type="submit" disabled={loading} className="!w-auto h-11 rounded-xl !px-10 font-bold shadow-sm">
          {loading ? "جاري الحفظ..." : "حفظ الكوبون"}
        </Button>
      </div>
    </form>
  );
}
