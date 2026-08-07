"use client";

import { useContext } from "react";
import { PermissionContext } from "@/components/dashboard/PermissionContext";

/**
 * Hook to access permissions in client components.
 */
export function usePermissions() {
  const context = useContext(PermissionContext);
  
  if (context === undefined) {
    throw new Error("usePermissions must be used within a PermissionProvider");
  }
  
  return context;
}
