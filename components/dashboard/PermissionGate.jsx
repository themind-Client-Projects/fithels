"use client";

import React from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { hasPermission } from "@/lib/permissions";
import { useSession } from "next-auth/react";

/**
 * A wrapper component that only renders its children if the user has the required permission.
 * If fallback is provided, it renders that instead.
 */
export default function PermissionGate({ permission, children, fallback = null }) {
  const permissions = usePermissions();
  const { data: session, status } = useSession();

  if (status === "loading" || status !== "authenticated") {
    return fallback;
  }

  const dbUser = {
    role: session?.user?.role || 'EMPLOYEE',
    permissions: permissions
  };

  if (!hasPermission(dbUser, permission)) {
    return fallback;
  }

  return <>{children}</>;
}
