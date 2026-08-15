"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { RotateCcw } from "lucide-react";
import { useContextElement } from "@/context/Context";

/**
 * "Order again" — rebuild a past order's basket from the live catalogue.
 *
 * The one rule that matters: this re-orders the PRODUCTS, never the PRICES.
 * Every line is rebuilt from `item.product` (the current row) and never from
 * `item.price` (what was charged at the time). Carrying the historic price
 * forward would show the shopper one number and charge them another, because
 * POST /api/orders always re-derives price from the database — so the cart would
 * simply be lying. If a product got cheaper or dearer, the new basket reflects
 * today.
 *
 * Items that cannot be honoured are skipped rather than silently dropped:
 *   - the product row is gone (deleted since the order),
 *   - it is no longer `isActive` (withdrawn from sale),
 *   - it is out of stock,
 *   - it is already sitting in the cart under the same size/colour key.
 * The caller is told exactly how many were added and how many were not, because
 * "some of this order is unavailable" is information the shopper needs before
 * they reach checkout and meet a 409.
 */
export default function ReorderButton({ order, variant = "inline" }) {
  const { addProductToCart, cartProducts } = useContextElement();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || "ar";
  const t = useTranslations("myOrders");

  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleReorder = () => {
    setBusy(true);
    setResult(null);

    let added = 0;
    let unavailable = 0;
    let alreadyInCart = 0;

    for (const item of order.items || []) {
      const product = item.product;

      if (!product || product.isActive === false || (product.stock ?? 0) < 1) {
        unavailable += 1;
        continue;
      }

      // Shape the cart context expects: `id` is the slug it keys and links on,
      // `dbId` is the real database id checkout sends as productId.
      const cartProduct = {
        id: product.slug ?? product.id,
        dbId: product.id,
        title: locale === "en" ? product.titleEn : product.titleAr,
        // Today's price, not the historic one.
        price: product.salePrice ?? product.price,
        oldPrice:
          product.salePrice && product.salePrice < product.price
            ? product.price
            : null,
        imgSrc: product.images?.[0] ?? "",
        // Only re-add as much as is actually on the shelf.
        quantity: Math.min(item.quantity || 1, product.stock),
      };

      const ok = addProductToCart(
        cartProduct,
        cartProduct.quantity,
        false, // do not pop the cart drawer for every line
        { size: item.size ?? undefined, color: item.color ?? undefined }
      );

      // addProductToCart returns false when this exact size/colour line is
      // already in the basket — that is "already there", not a failure.
      if (ok) added += 1;
      else alreadyInCart += 1;
    }

    setResult({ added, unavailable, alreadyInCart });
    setBusy(false);
  };

  const isBlock = variant === "block";

  return (
    <div className={isBlock ? "" : "d-inline-flex flex-column"} style={{ gap: "6px" }}>
      <button
        type="button"
        onClick={handleReorder}
        disabled={busy || !(order.items || []).length}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          background: "none",
          border: "1px solid #e2e8f0",
          borderRadius: "999px",
          padding: isBlock ? "10px 20px" : "6px 14px",
          fontSize: isBlock ? "14px" : "13px",
          fontWeight: 600,
          cursor: busy ? "default" : "pointer",
          color: "#1e293b",
          opacity: busy ? 0.6 : 1,
          width: isBlock ? "100%" : "auto",
          justifyContent: "center",
        }}
      >
        <RotateCcw size={isBlock ? 16 : 14} aria-hidden="true" />
        {t("reorder")}
      </button>

      {result && (
        <div role="status" style={{ fontSize: "12px", lineHeight: 1.5 }}>
          {result.added > 0 && (
            <div style={{ color: "#059669" }}>
              {t("reorderAdded", { count: result.added })}{" "}
              <button
                type="button"
                onClick={() => router.push(`/${locale}/checkout`)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "#059669",
                  textDecoration: "underline",
                  cursor: "pointer",
                  font: "inherit",
                }}
              >
                {t("reorderGoToCheckout")}
              </button>
            </div>
          )}
          {result.alreadyInCart > 0 && (
            <div style={{ color: "#64748b" }}>
              {t("reorderAlreadyInCart", { count: result.alreadyInCart })}
            </div>
          )}
          {result.unavailable > 0 && (
            <div style={{ color: "#b45309" }}>
              {t("reorderUnavailable", { count: result.unavailable })}
            </div>
          )}
          {result.added === 0 && result.alreadyInCart === 0 && result.unavailable === 0 && (
            <div style={{ color: "#b45309" }}>{t("reorderNothing")}</div>
          )}
        </div>
      )}
    </div>
  );
}
