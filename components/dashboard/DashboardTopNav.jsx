"use client";

import React from "react";
import { usePathname, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function DashboardTopNav() {
  const pathname = usePathname();
  const params = useParams();
  const locale = params?.locale || "ar";
  const t = useTranslations("Dashboard");

  // Build breadcrumbs from pathname
  const pathSegments = pathname
    .replace(`/${locale}/dashboard`, "")
    .split("/")
    .filter(Boolean);

  const breadcrumbLabels = {
    orders: t("orders"),
    products: t("products"),
    categories: t("categories"),
    customers: t("customers"),
    settings: t("settings"),
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 lg:px-6">
      <SidebarTrigger className="-ms-1" />
      <Separator orientation="vertical" className="me-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            {pathSegments.length === 0 ? (
              <BreadcrumbPage>{t("overview")}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink href={`/${locale}/dashboard`}>
                {t("overview")}
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
          {pathSegments.length > 0 && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {breadcrumbLabels[pathSegments[0]] || pathSegments[0]}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
