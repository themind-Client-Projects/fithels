"use client";

import React from "react";
import { useTranslations } from "next-intl";
import TrustBadgeSettings from "@/components/dashboard/TrustBadgeSettings";

/**
 * Shop settings.
 *
 * Currently just the reassurance trio. It has its own page rather than living on
 * the banners screen because it is copy that applies to the whole shop, not to
 * one placement — and because the client asked to change it in one place and
 * have it apply everywhere.
 */
export default function SettingsPage() {
  const t = useTranslations("Dashboard");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-start text-2xl font-bold text-foreground">
          {t("settings")}
        </h1>
        <p className="text-start text-sm text-muted-foreground">
          {t("trustSectionHint")}
        </p>
      </div>

      <TrustBadgeSettings />
    </div>
  );
}
