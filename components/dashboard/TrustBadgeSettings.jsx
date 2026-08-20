"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Editor for the shop-wide reassurance trio.
 *
 * The three rows are fixed — the storefront draws one icon per slot, so the set
 * cannot grow or be reordered from here. What is editable is the wording, in
 * both locales, plus whether each one is shown at all.
 *
 * Everything saves in a single request. The three are read together on the
 * storefront, so saving them one at a time could leave a shopper looking at two
 * new lines and one old one.
 */
export default function TrustBadgeSettings() {
  const t = useTranslations("Dashboard");
  const [badges, setBadges] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/trust-badges");
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (!cancelled) setBadges(data);
      } catch {
        if (!cancelled) {
          setError(t("loadFailedDesc"));
          setBadges([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const update = (slot, field, value) => {
    setSaved(false);
    setBadges((prev) =>
      prev.map((b) => (b.slot === slot ? { ...b, [field]: value } : b))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/trust-badges", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badges }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || String(res.status));
      setSaved(true);
    } catch (err) {
      // Was a silent failure risk: without this the button simply re-enabled and
      // the admin had no way to know the copy had not been saved.
      setError(err?.message || t("loadFailedDesc"));
    } finally {
      setSaving(false);
    }
  };

  if (badges === null) {
    return (
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-44 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-start text-sm font-medium text-red-600"
        >
          {error}
        </div>
      )}

      {badges.map((badge) => (
        <div
          key={badge.slot}
          className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-start text-sm font-bold text-foreground">
              {t(`trustSlot${badge.slot}`)}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {badge.isActive ? t("active") : t("inactive")}
              </span>
              <Switch
                checked={badge.isActive}
                onCheckedChange={(checked) =>
                  update(badge.slot, "isActive", checked)
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2" dir="rtl">
              <Label className="text-start text-xs font-semibold text-muted-foreground">
                {t("trustTitleAr")}
              </Label>
              <Input
                value={badge.titleAr}
                onChange={(e) => update(badge.slot, "titleAr", e.target.value)}
                className="h-11 !px-4 !text-start rounded-xl bg-muted/30"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-start text-xs font-semibold text-muted-foreground">
                {t("trustTitleEn")}
              </Label>
              <Input
                value={badge.titleEn}
                onChange={(e) => update(badge.slot, "titleEn", e.target.value)}
                dir="ltr"
                className="h-11 !px-4 !text-start rounded-xl bg-muted/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2" dir="rtl">
              <Label className="text-start text-xs font-semibold text-muted-foreground">
                {t("trustTextAr")}
              </Label>
              <Textarea
                value={badge.textAr}
                onChange={(e) => update(badge.slot, "textAr", e.target.value)}
                rows={2}
                className="!px-4 !text-start rounded-xl bg-muted/30 py-3"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-start text-xs font-semibold text-muted-foreground">
                {t("trustTextEn")}
              </Label>
              <Textarea
                value={badge.textEn}
                onChange={(e) => update(badge.slot, "textEn", e.target.value)}
                dir="ltr"
                rows={2}
                className="!px-4 !text-start rounded-xl bg-muted/30 py-3"
              />
            </div>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving} className="h-11 px-8">
          {saving ? t("loading") : t("save")}
        </Button>
        {saved && (
          <span role="status" className="text-sm font-medium text-emerald-600">
            {t("trustSaved")}
          </span>
        )}
      </div>
    </div>
  );
}
