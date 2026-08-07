"use client";
import React from "react";
import { useCurrencyStore } from "@/stores/useCurrencyStore";

export default function CurrencyFormatter({ price }) {
  const { currency } = useCurrencyStore();

  if (price == null || isNaN(price)) return null;

  if (currency === "IQD") {
    return <>{(price * 1500).toLocaleString("en-US")} IQD</>;
  }

  return <>${Number(price).toFixed(2)}</>;
}
