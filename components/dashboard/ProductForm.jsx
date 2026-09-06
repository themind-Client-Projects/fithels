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
import ColorMultiSelect from "@/components/dashboard/ColorMultiSelect";
import VariantStockGrid from "@/components/dashboard/VariantStockGrid";
import { normaliseVariants, totalStock } from "@/lib/products/variants";
import { resolveColor } from "@/lib/products/colors";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CANONICAL_SIZES,
  DEFAULT_PRODUCT_SIZES,
  SIZE_CONVERSIONS,
} from "@/lib/products/sizes";

export default function ProductForm({ product, onSuccess, onCancel }) {
  const isEditing = !!product;
  const t = useTranslations("Dashboard");

  const [titleEn, setTitleEn] = useState(product?.titleEn || "");
  const [titleAr, setTitleAr] = useState(product?.titleAr || "");
  const [descEn, setDescEn] = useState(product?.descEn || "");
  const [descAr, setDescAr] = useState(product?.descAr || "");
  const [sizeGuideEn, setSizeGuideEn] = useState(product?.sizeGuideEn || "");
  const [sizeGuideAr, setSizeGuideAr] = useState(product?.sizeGuideAr || "");
  const [deliveryEn, setDeliveryEn] = useState(product?.deliveryEn || "");
  const [deliveryAr, setDeliveryAr] = useState(product?.deliveryAr || "");
  const [price, setPrice] = useState(product?.price?.toString() || "");
  const [salePrice, setSalePrice] = useState(product?.salePrice?.toString() || "");
  const [categoryId, setCategoryId] = useState(product?.categoryId || "");
  /**
   * Which section is showing in the first picker.
   *
   * Derived from the product's category on edit — the product stores only the
   * category, so the section is looked up once the category list arrives rather
   * than being a second column on Product that could disagree with it.
   */
  const [sectionId, setSectionId] = useState("");
  // An array, not a comma-separated string. The field is a checklist now, and
  // round-tripping through free text is what allowed values like "S, M, L, XL"
  // — and, in one case, a paragraph of lorem ipsum — into the sizes column.
  //
  // Seeded only when creating. On edit the product's own sizes are shown as they
  // are, including an empty list: clearing the sizes is a deliberate state and
  // must not be silently repopulated with defaults.
  const [sizes, setSizes] = useState(() =>
    isEditing
      ? (product?.sizes ?? []).map((size) => String(size).trim()).filter(Boolean)
      : [...DEFAULT_PRODUCT_SIZES]
  );

  // Sizes this product already carries that fall outside the canonical run get
  // their own rows, so opening an older product in the new picker cannot quietly
  // discard them. Derived from the product rather than from the live selection,
  // so unticking one does not make its row disappear mid-edit.
  const extraSizes = (isEditing ? (product?.sizes ?? []) : [])
    .map((size) => String(size).trim())
    .filter((size) => size && !CANONICAL_SIZES.includes(size));

  const sizeRows = [...CANONICAL_SIZES, ...extraSizes];

  const toggleSize = (size) =>
    setSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  // Array, not a comma-joined string: the colour picker owns the vocabulary
  // now, so there is nothing to parse back out of a text field.
  const [colors, setColors] = useState(product?.colors ?? []);
  /**
   * Stock, one entry per (size, colour) pair.
   *
   * Held as a flat list rather than a nested map so it is exactly what the api
   * stores and what it hands back — no shape to translate on the way in or out,
   * and nowhere for the two to disagree.
   */
  const [variants, setVariants] = useState(() => product?.variants ?? []);

  /**
   * The stock numbers as this form was FIRST given them.
   *
   * Sent alongside the edited ones so the server can apply what actually
   * changed rather than overwriting live inventory with a snapshot: a form left
   * open while a sale goes through used to put the sold pairs back on the shelf
   * the moment anything on the page was saved, including just a price.
   */
  const [variantsBaseline] = useState(() => product?.variants ?? []);
  const [isActive, setIsActive] = useState(product?.isActive ?? true);

  /**
   * Photos per colour, as [{ color, images }].
   *
   * The product gallery above stays the fallback: it is what a card shows and
   * what the page shows before a colour is picked. A colour with no photos of
   * its own simply has no row, so a shop can photograph one colour at a time
   * instead of having to do all of them before any of it works.
   */
  const [colorImages, setColorImages] = useState(() => product?.colorImages ?? []);

  const imagesForColor = (color) =>
    colorImages.find((row) => row.color === color)?.images ?? [];

  const addColorImage = (color, url) =>
    setColorImages((prev) => {
      const existing = prev.find((row) => row.color === color);
      if (!existing) return [...prev, { color, images: [url] }];
      return prev.map((row) =>
        row.color === color ? { ...row, images: [...row.images, url] } : row
      );
    });

  const removeColorImage = (color, index) =>
    setColorImages((prev) =>
      prev
        .map((row) =>
          row.color === color
            ? { ...row, images: row.images.filter((_, i) => i !== index) }
            : row
        )
        // A colour with nothing left loses its row, so "no photos of its own"
        // has one representation rather than two.
        .filter((row) => row.images.length > 0)
    );
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  /**
   * WHICH colour is receiving files, not merely that something is.
   *
   * A single shared boolean made every colour's button spin and every one of
   * them go dead while any upload ran, so adding a photo to the second colour
   * looked like the first had lost its own and was uploading too. With one
   * colour on screen nobody could see it; with two it is the first thing you
   * notice.
   */
  const [uploadingColor, setUploadingColor] = useState(null);
  const uploading = uploadingColor !== null;
  const [error, setError] = useState("");
  const errorRef = React.useRef(null);
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

  // Both lists are DERIVED from the one categories fetch — no second request and
  // no second copy of the tree to keep in step.
  const sections = categories.filter((c) => !c.parentId);

  /**
   * The section actually shown.
   *
   * On edit the product knows only its category, so the section comes from that
   * category's parent until the admin picks a different one. Deriving it beats
   * syncing it in an effect: no second render pass, and no window in which the
   * two pickers disagree.
   */
  const chosenCategory = categories.find((c) => c.id === categoryId);
  const effectiveSectionId = sectionId || chosenCategory?.parentId || "";

  const categoriesInSection = categories.filter(
    (c) => c.parentId && c.parentId === effectiveSectionId
  );

  // The dialog scrolls, and the banner is its first child — an admin who
  // scrolled down to reach Save never saw the message they had just triggered.
  React.useEffect(() => {
    if (error) {
      errorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      errorRef.current?.focus?.();
    }
  }, [error]);

  /**
   * Upload the picked files, handing each finished url to `collect`.
   *
   * `collect` is required: every photo belongs to a colour now, so there is no
   * such thing as one with no home. The interesting part here is the error
   * mapping below — a second copy of that is the one that stops telling admins
   * whether a file was too large or simply not an image.
   */
  const handleFileUpload = async (e, collect, forColor) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingColor(forColor ?? "");
    setError("");

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
        if (typeof data?.url !== "string" || !data.url) {
          throw new Error(t("uploadError.GENERIC"));
        }

        // Handed over as each file lands, and every collector uses the
        // functional form. Committing a snapshot taken before the loop instead
        // meant an image the admin removed WHILE an upload was running came
        // back when it finished.
        collect(data.url);
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || t("uploadError.GENERIC"));
    } finally {
      setUploadingColor(null);
      // Allow re-selecting the same file after a failure.
      e.target.value = "";
    }
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
      sizeGuideEn,
      sizeGuideAr,
      deliveryEn,
      deliveryAr,
      price,
      salePrice: salePrice || null,
      categoryId,
      // Emitted in canonical order whatever order the boxes were ticked in, so
      // the stored array is stable and diffs stay readable.
      sizes: sizeRows.filter((size) => sizes.includes(size)),
      colors: Array.isArray(colors) ? colors : [],
      // Cleaned against what is actually ticked, so a quantity typed for a
      // colour that was later unticked is not sent at all.
      variants: normaliseVariants(
        variants,
        sizeRows.filter((size) => sizes.includes(size)),
        Array.isArray(colors) ? colors : []
      ),
      variantsBaseline,
      isActive,
      // Only colours still ticked survive; the api re-checks.
      colorImages: colorImages.filter((row) => colors.includes(row.color)),
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
        // t() throws on a missing key, so only translate reasons we ship.
        const known = [
          "NOT_A_NUMBER", "PRICE_NOT_POSITIVE", "SALE_PRICE_NOT_POSITIVE",
          "SALE_PRICE_NOT_A_DISCOUNT", "PRICE_BELOW_EXISTING_SALE_PRICE",
          "STOCK_NOT_A_WHOLE_NUMBER",
        ];
        setError(
          known.includes(data.reason)
            ? t(`pricingError.${data.reason}`)
            : data.error || t("uploadError.GENERIC")
        );
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 py-4">
      {error && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 font-medium text-start"
        >
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
          {/* Both optional. The product page always shows the shop-wide size
              conversion table, so this only adds notes specific to the shoe; and
              the delivery section is hidden entirely when left blank rather than
              falling back to boilerplate the shop has not committed to. */}
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="sizeGuideEn" className="text-start text-sm font-bold text-foreground">{t("sizeGuideEn")}</Label>
            <Textarea
              id="sizeGuideEn"
              value={sizeGuideEn}
              onChange={(e) => setSizeGuideEn(e.target.value)}
              placeholder="e.g. Runs small — we suggest taking one size up"
              className="!px-4 !text-start py-3 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl"
              rows={2}
            />
          </div>
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="deliveryEn" className="text-start text-sm font-bold text-foreground">{t("deliveryEn")}</Label>
            <Textarea
              id="deliveryEn"
              value={deliveryEn}
              onChange={(e) => setDeliveryEn(e.target.value)}
              placeholder="Delivery and returns for this product"
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
          <div className="flex flex-col gap-2.5" dir="rtl">
            <Label htmlFor="sizeGuideAr" className="text-start text-sm font-bold text-foreground">{t("sizeGuideAr")}</Label>
            <Textarea
              id="sizeGuideAr"
              value={sizeGuideAr}
              onChange={(e) => setSizeGuideAr(e.target.value)}
              placeholder="مثال: المقاس صغير قليلًا — ننصح باختيار مقاس أكبر"
              className="!px-4 !text-start py-3 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl"
              rows={2}
            />
          </div>
          <div className="flex flex-col gap-2.5" dir="rtl">
            <Label htmlFor="deliveryAr" className="text-start text-sm font-bold text-foreground">{t("deliveryAr")}</Label>
            <Textarea
              id="deliveryAr"
              value={deliveryAr}
              onChange={(e) => setDeliveryAr(e.target.value)}
              placeholder="تفاصيل التوصيل والإرجاع لهذا المنتج"
              className="!px-4 !text-start py-3 bg-muted/30 focus-visible:ring-primary/20 transition-all rounded-xl"
              rows={3}
            />
          </div>
        </TabsContent>
      </Tabs>

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

      {/* Section first, then the category inside it. Two pickers rather than one
          long flat list: with a section chosen the second list is short enough to
          read, and it makes the tree visible to whoever is filing the product.
          Only the category is saved — the section is implied by it. */}
      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-2.5">
          <Label htmlFor="sectionId" className="text-start text-sm font-bold text-foreground">{t("section")}</Label>
          <select
            id="sectionId"
            value={effectiveSectionId}
            onChange={(e) => {
              setSectionId(e.target.value);
              // The chosen category almost certainly belongs to the old section,
              // so clear it rather than leave a mismatched pair on screen.
              setCategoryId("");
            }}
            className="flex h-12 w-full rounded-xl border border-input bg-muted/30 px-4 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-primary/20 transition-all"
          >
            <option value="">{t("selectSection")}</option>
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.nameAr || sec.nameEn}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2.5">
          <Label htmlFor="categoryId" className="text-start text-sm font-bold text-foreground">{t("category")}</Label>
          <select
            id="categoryId"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={!effectiveSectionId}
            className="flex h-12 w-full rounded-xl border border-input bg-muted/30 px-4 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-primary/20 transition-all disabled:cursor-not-allowed disabled:opacity-60"
            required
          >
            <option value="">
              {effectiveSectionId ? t("selectCategory") : t("selectSectionFirst")}
            </option>
            {categoriesInSection.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nameAr || cat.nameEn}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-2.5">
          <Label className="text-start text-sm font-bold text-foreground">{t("sizes")}</Label>
          <p className="text-start text-xs text-muted-foreground">{t("sizesHint")}</p>
          {/* One row per size, stacked. A label wraps each row so the whole row
              is the hit target, not just the 16px box — and so the checkbox and
              its size stay associated for screen readers without an htmlFor/id
              pair per row. Spacing is logical (ms-auto), so the meta column
              sits on the correct side in Arabic and English alike. */}
          <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/20 p-2">
            {sizeRows.map((size) => {
              const checked = sizes.includes(size);
              const isExtra = !CANONICAL_SIZES.includes(size);
              const cm = SIZE_CONVERSIONS.find((row) => row.eu === size)?.cm;
              return (
                <label
                  key={size}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                    checked
                      ? "border-primary/40 bg-background"
                      : "border-transparent bg-background/40"
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleSize(size)}
                  />
                  <span
                    className={`text-sm font-bold ${
                      checked ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {size}
                  </span>
                  <span className="ms-auto text-xs text-muted-foreground">
                    {isExtra
                      ? t("sizeCustom")
                      : checked
                      ? cm
                        ? `${cm} cm`
                        : ""
                      : t("sizeNotStocked")}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-2.5">
          <Label htmlFor="colors" className="text-start text-sm font-bold text-foreground">{t("colors")}</Label>
          <ColorMultiSelect value={colors} onChange={setColors} />
        </div>
      </div>

      {/* Photos per colour.
          Appears only once colours are chosen, because a gallery for a colour
          the shoe is not sold in is not a thing that can exist. A colour left
          empty falls back to the product gallery above, so nothing has to be
          photographed before the product can be saved. */}
      {colors.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <Label className="text-start text-sm font-bold text-foreground">
            {t("colorImagesLabel")}
          </Label>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t("colorImagesHint")}
          </p>

          <div className="flex flex-col gap-3">
            {colors.map((color) => {
              const swatch = resolveColor(color);
              const shots = imagesForColor(color);

              return (
                <div key={color} className="rounded-xl border border-border p-3">
                  <div className="mb-2.5 flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/15"
                      style={{ backgroundColor: swatch.hex }}
                    />
                    <span className="text-sm font-semibold">{color}</span>
                    <span className="text-xs text-muted-foreground">
                      {shots.length > 0
                        ? `${shots.length}`
                        : t("usesDefaultGallery")}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {shots.map((img, idx) => (
                      <div
                        key={`${img}-${idx}`}
                        className="relative w-20 h-20 rounded-lg overflow-hidden border border-border"
                      >
                        <Image
                          src={img}
                          alt=""
                          fill
                          sizes="80px"
                          style={{ objectFit: "cover" }}
                        />
                        <button
                          type="button"
                          onClick={() => removeColorImage(color, idx)}
                          aria-label={t("delete")}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-80 hover:opacity-100"
                        >
                          ✕
                        </button>
                      </div>
                    ))}

                    <label
                      className={`flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed border-border rounded-lg transition-colors ${
                        uploading
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer hover:bg-muted/50"
                      }`}
                    >
                      {uploadingColor === color ? (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="text-xl text-muted-foreground">+</span>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        multiple
                        disabled={uploading}
                        onChange={(e) =>
                          handleFileUpload(
                            e,
                            (url) => addColorImage(color, url),
                            color
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sits directly under the sizes and colours it is built from, so the
          three are read as one decision rather than three unrelated fields. */}
      <div className="flex flex-col gap-2.5">
        <Label className="text-start text-sm font-bold text-foreground">
          {t("stockPerVariant")}
        </Label>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("stockPerVariantHint")}
        </p>
        <VariantStockGrid
          sizes={sizeRows.filter((size) => sizes.includes(size))}
          colors={Array.isArray(colors) ? colors : []}
          variants={variants}
          onChange={setVariants}
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
        <Button type="submit" disabled={loading || uploading} className="h-11 !px-10 rounded-xl font-bold shadow-sm !w-auto">
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
