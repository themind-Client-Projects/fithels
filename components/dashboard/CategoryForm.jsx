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


/**
 * One of the two answers to "what is this row".
 *
 * A whole card is the click target, not just the radio: on a tablet — which is
 * what the shop is run from — a 16px dot is a poor thing to have to hit.
 */
function KindOption({
  checked,
  onChange,
  title,
  help,
  disabled = false,
  disabledReason,
}) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors ${
        disabled
          ? "cursor-not-allowed border-border bg-muted/20 opacity-60"
          : checked
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40"
      }`}
    >
      <input
        type="radio"
        name="categoryKind"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-1 h-4 w-4 shrink-0 accent-primary"
      />
      <span className="text-start">
        <span className="block text-sm font-bold text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
          {disabled ? disabledReason : help}
        </span>
      </span>
    </label>
  );
}

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

  /**
   * WHAT THIS ROW IS, asked outright.
   *
   * A main section used to be created by leaving the parent picker on its first
   * option — the row was top-level because nothing had been chosen. That is a
   * decision made by NOT doing something, which is invisible: nothing on the
   * form said "this is how you create a main section". Now the two kinds are
   * offered side by side and the picker only appears for the one that needs it.
   */
  const [kind, setKind] = useState(category?.parentId ? "sub" : "main");

  /**
   * Which section a sub-section belongs to.
   *
   * Sections are fetched rather than passed in so the picker is right even when
   * the form is opened straight after another one created a section.
   */
  const [parentId, setParentId] = useState(category?.parentId || "");
  const [sections, setSections] = useState([]);

  // A main section that already holds sub-sections cannot itself be moved
  // inside another — the tree is two levels deep.
  const hasChildren = (category?._count?.children ?? 0) > 0;
  const available = sections.filter((s) => s.id !== category?.id);
  const canBeSub = !hasChildren && available.length > 0;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/categories");
        if (!res.ok) return;
        const all = await res.json();
        if (!cancelled) {
          // Only top-level rows can be parents.
          setSections(all.filter((c) => !c.parentId));
        }
      } catch {
        /* the picker just stays empty; the form still saves as a section */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    // Asked for a sub-section but never said which section: the api would
    // silently file it as a main section, which is not what was asked for.
    if (kind === "sub" && !parentId) {
      setError(t("chooseMainSectionRequired"));
      return;
    }
    setError("");
    setLoading(true);

    // null is what the api reads as "top level".
    const body = {
      nameEn,
      nameAr,
      slug,
      parentId: kind === "sub" ? parentId : null,
    };

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

      {/* Where this sits in the tree, asked as a question with two answers
          rather than inferred from an untouched dropdown. */}
      <div className="space-y-2">
        <Label>{t("categoryKind")}</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          <KindOption
            checked={kind === "main"}
            onChange={() => setKind("main")}
            title={t("mainSection")}
            help={t("mainSectionHelp")}
          />
          <KindOption
            checked={kind === "sub"}
            onChange={() => setKind("sub")}
            title={t("subSection")}
            help={t("subSectionHelp")}
            // Offered but explained when it cannot be taken, rather than simply
            // missing: "why can I not do this" is the question a hidden option
            // leaves behind.
            disabled={!canBeSub}
            disabledReason={
              hasChildren ? t("sectionHasChildren") : t("needMainSectionFirst")
            }
          />
        </div>
      </div>

      {kind === "sub" && canBeSub && (
        <div className="space-y-2">
          <Label htmlFor="parentId">{t("chooseMainSection")}</Label>
          <select
            id="parentId"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="h-12 w-full rounded-xl border border-input bg-muted/30 px-4 text-start"
          >
            <option value="">— {t("chooseMainSection")} —</option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nameAr}
              </option>
            ))}
          </select>
        </div>
      )}

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
