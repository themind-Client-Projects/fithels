"use client";
import React from "react";
import { useCurrencyStore } from "@/stores/useCurrencyStore";
import { formatMoney } from "@/lib/currency";

export default function CurrencyFormatter({ price }) {
  const { currency } = useCurrencyStore();

  if (price == null || isNaN(price)) return null;

  // Rate comes from lib/currency so the storefront, the dashboard and the
  // amount Wayle actually charges cannot drift apart.
  return <>{formatMoney(price, currency === "IQD" ? "IQD" : "USD")}</>;
}
