"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";

const STATUS_VARIANTS = {
  PENDING: "secondary",
  CONFIRMED: "default",
  PROCESSING: "default",
  IN_DELIVERY: "default",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

const STATUS_CLASSES = {
  PENDING: "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20",
  CONFIRMED: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20",
  PROCESSING: "bg-purple-500/10 text-purple-600 hover:bg-purple-500/20",
  IN_DELIVERY: "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20",
  DELIVERED: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20",
  CANCELLED: "bg-red-500/10 text-red-600 hover:bg-red-500/20",
};

export default function OrderStatusBadge({ status }) {
  const t = useTranslations("Dashboard");

  const statusLabels = {
    PENDING: t("pending"),
    CONFIRMED: t("confirmed"),
    PROCESSING: t("processing"),
    IN_DELIVERY: t("inDelivery"),
    DELIVERED: t("delivered"),
    CANCELLED: t("cancelled"),
  };

  const label = statusLabels[status] || status;
  const customClass = STATUS_CLASSES[status] || STATUS_CLASSES.PENDING;

  return (
    <Badge variant="outline" className={`!h-auto !py-1.5 !px-4 text-sm rounded-full border-transparent font-bold shadow-sm ${customClass}`}>
      {label}
    </Badge>
  );
}
