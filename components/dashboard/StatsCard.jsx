"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StatsCard({ icon: Icon, value, label, trend }) {
  return (
    <div 
      style={{ padding: "1.5rem", borderRadius: "1rem", backgroundColor: "#fff", border: "1px solid #e9ecef", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", display: "flex", flexDirection: "column" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        {Icon && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "2.5rem", height: "2.5rem", borderRadius: "0.5rem", backgroundColor: "rgba(26, 26, 46, 0.05)", color: "#1a1a2e", flexShrink: 0 }}>
            <Icon style={{ width: "1.25rem", height: "1.25rem" }} strokeWidth={2} />
          </div>
        )}
        <h3 style={{ fontSize: "0.875rem", fontWeight: 500, color: "#6c757d", margin: 0 }}>{label}</h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: "1.875rem", fontWeight: 700, letterSpacing: "-0.025em", color: "#1a1a2e", lineHeight: 1 }}>{value}</div>
        {trend && (
          <p style={{ display: "flex", alignItems: "center", fontSize: "0.75rem", color: "#6c757d", marginTop: "0.5rem" }}>
            <span style={{ display: "inline-flex", alignItems: "center", backgroundColor: "#ecfdf5", color: "#059669", padding: "0.125rem 0.375rem", borderRadius: "0.375rem", fontWeight: 600, marginRight: "0.375rem", marginLeft: "0.375rem" }}>
              {trend}
            </span>
            <span>منذ الشهر الماضي</span>
          </p>
        )}
      </div>
    </div>
  );
}
