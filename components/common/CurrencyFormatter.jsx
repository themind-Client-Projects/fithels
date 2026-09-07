"use client";
import React from "react";
import { useCurrencyStore } from "@/stores/useCurrencyStore";
import { formatPrice } from "@/lib/currency";

/**
 * Renders a price in whichever currency the shopper is browsing in.
 *
 * `price` is dollars, `priceIqd` whole dinars, and the two are set
 * INDEPENDENTLY by the shop — so this picks one, it never converts between
 * them. Passing `priceIqd` is what makes a dinar price render as the exact
 * number that was typed.
 *
 * `priceIqd` is optional so the many template components that were only ever
 * given a dollar figure keep working; without it this falls back to the old
 * rate conversion rather than rendering nothing.
 */
export default function CurrencyFormatter({ price, priceIqd }) {
  const { currency } = useCurrencyStore();

  const hasUsd = price != null && !isNaN(price);
  const hasIqd = priceIqd != null && !isNaN(priceIqd);
  if (!hasUsd && !hasIqd) return null;

  return (
    <>{formatPrice(price, priceIqd, currency === "IQD" ? "IQD" : "USD")}</>
  );
}
