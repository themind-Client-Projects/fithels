"use client";

import React, { createContext } from "react";

// Create context for storing the current user's permissions
export const PermissionContext = createContext(undefined);

export function PermissionProvider({ permissions, children }) {
  return (
    <PermissionContext.Provider value={permissions}>
      {children}
    </PermissionContext.Provider>
  );
}
