"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { formatMoney } from "@/lib/currency";
import { allowedNextStatuses } from "@/lib/orders/status";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Phone, MapPin, Save } from "lucide-react";
import { orderLabel } from "@/lib/orders/reference";

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "IN_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

export default function EditOrderPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || "ar";
  const orderId = params?.id;
  const t = useTranslations("Dashboard");

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");

  const statusLabels = {
    PENDING: t("pending"),
    CONFIRMED: t("confirmed"),
    PROCESSING: t("processing"),
    IN_DELIVERY: t("inDelivery"),
    DELIVERED: t("delivered"),
    CANCELLED: t("cancelled"),
  };

  useEffect(() => {
    if (!orderId) return;
    fetch(`/api/orders/${orderId}`)
      // Without this check an error body like {error:"Order not found"} is
      // truthy, passes the `if (!order)` guard below, and the page crashes on
      // order.id.slice() instead of showing the not-found card.
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.id) return;
        setOrder(data);
        setPhone(data.phone || "");
        setLocation(data.location || "");
        setNotes(data.notes || "");
        setStatus(data.status || "PENDING");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleSave = async () => {
    // The create endpoint requires both of these; PATCH did not, so saving with
    // the fields emptied silently removed the only way to reach the customer
    // about a delivery already in progress.
    const missing = {};
    if (!phone.trim()) missing.phone = true;
    if (!location.trim()) missing.location = true;
    if (Object.keys(missing).length) {
      setFieldErrors(missing);
      setSaveError(t("requiredFieldsMissing"));
      return;
    }
    setFieldErrors({});
    setSaveError("");

    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.trim(),
          location: location.trim(),
          notes: notes || null,
          // Only send the status when it was actually changed here. Sending it
          // on every save meant a tab opened before someone else advanced the
          // order silently reverted their change — and re-sending DELIVERED
          // used to rewrite the real delivery date to today.
          ...(status !== order?.status && { status }),
        }),
      });

      if (res.ok) {
        router.push(`/${locale}/dashboard/orders/${orderId}`);
        return;
      }

      const data = await res.json().catch(() => ({}));
      // A 409 means someone else moved this order on, or the transition is not
      // allowed from its current state. Either way the copy on screen is stale,
      // so say what to do rather than leaving them to guess.
      setSaveError(
        res.status === 409
          ? `${data.error || t("orderChangedElsewhere")} ${t("reloadToContinue")}`
          : data.error || t("saveFailed")
      );
    } catch (error) {
      console.error("Failed to update order:", error);
      setSaveError(t("connectionFailed"));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "0.625rem 0.875rem",
    borderRadius: "0.5rem",
    border: "1px solid #e2e8f0",
    fontSize: "0.875rem",
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color 0.2s",
  };

  if (loading) {
    return (
      <DashboardShell title={t("editOrder")}>
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </DashboardShell>
    );
  }

  if (!order) {
    return (
      <DashboardShell title={t("orderNotFound")}>
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">{t("orderNotFoundDesc")}</p>
          <Button variant="outline" onClick={() => router.push(`/${locale}/dashboard/orders`)}>
            <ArrowLeft className="h-4 w-4 me-2" />
            {t("backToOrders")}
          </Button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title={`${t("editOrder")} ${orderLabel(order.id)}`}
      action={
        <button
          onClick={() => router.push(`/${locale}/dashboard/orders/${orderId}`)}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1.25rem", backgroundColor: "#fff", border: "1px solid #e9ecef", borderRadius: "9999px", fontSize: "0.875rem", fontWeight: 700, color: "#1a1a2e", cursor: "pointer" }}
        >
          <ArrowLeft style={{ width: "1rem", height: "1rem" }} />
          {t("back")}
        </button>
      }
    >
      {saveError && (
        <div
          role="alert"
          className="mb-4 max-w-4xl rounded-xl border border-red-200 bg-red-50 p-4 text-start text-sm font-medium text-red-600"
        >
          {saveError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
        {/* Contact & Location */}
        <div style={{ borderRadius: "1rem", border: "1px solid #e9ecef", backgroundColor: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f3f5", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Phone style={{ color: "#6c757d", width: "1.25rem", height: "1.25rem" }} />
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1a1a2e", margin: 0 }}>{t("customerInfo")}</h2>
          </div>
          <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>{t("orderPhone")}</label>
              <input
                type="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setFieldErrors((p) => ({ ...p, phone: false })); }}
                placeholder="+964 7XX XXX XXXX"
                style={{ ...inputStyle, borderColor: fieldErrors.phone ? "#dc2626" : inputStyle.border.split(" ").pop() }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>{t("deliveryLocation")}</label>
              <textarea
                rows={3}
                value={location}
                onChange={(e) => { setLocation(e.target.value); setFieldErrors((p) => ({ ...p, location: false })); }}
                placeholder="المدينة، الحي، الشارع..."
                style={{ ...inputStyle, borderColor: fieldErrors.location ? "#dc2626" : inputStyle.border.split(" ").pop() }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>{t("notes")}</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("enterNote")}
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Status */}
        <div style={{ borderRadius: "1rem", border: "1px solid #e9ecef", backgroundColor: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f3f5" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1a1a2e", margin: 0 }}>{t("statusDelivery")}</h2>
          </div>
          <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>{t("updateStatus")}</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={inputStyle}
              >
                {/* Terminal statuses offer nothing further, so the only
                    option shown is the current one. */}
                {ORDER_STATUSES.filter(
                  (s) =>
                    s === order?.status ||
                    allowedNextStatuses(order?.status || "PENDING").includes(s)
                ).map((s) => (
                  <option key={s} value={s}>{statusLabels[s]}</option>
                ))}
              </select>
            </div>

            {/* Order Info (read-only) */}
            <div style={{ padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ color: "#6c757d", fontSize: "0.8rem" }}>{t("customer")}</span>
                <span style={{ fontWeight: 600, fontSize: "0.8rem" }}>{order.user?.name || order.user?.email || "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ color: "#6c757d", fontSize: "0.8rem" }}>{t("items")}</span>
                <span style={{ fontWeight: 600, fontSize: "0.8rem" }}>{order.items?.length || 0}</span>
              </div>
              {order.discount > 0 && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={{ color: "#6c757d", fontSize: "0.8rem" }}>{t("subtotal")}</span>
                    <span style={{ fontWeight: 600, fontSize: "0.8rem" }}>{formatMoney(order.subtotal, "IQD")}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={{ color: "#059669", fontSize: "0.8rem" }}>
                      {t("discount")}{order.couponCode ? ` (${order.couponCode})` : ""}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: "0.8rem", color: "#059669" }}>
                      − {formatMoney(order.discount, "IQD")}
                    </span>
                  </div>
                </>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#6c757d", fontSize: "0.8rem" }}>{t("total")}</span>
                <span style={{ fontWeight: 700, fontSize: "1rem", color: "#2563eb" }}>{formatMoney(order.total, "IQD")}</span>
              </div>
            </div>
          </div>

          <div style={{ padding: "0 1.5rem 1.5rem" }}>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-11 rounded-xl font-bold text-base gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? t("saving") : t("save")}
            </Button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
