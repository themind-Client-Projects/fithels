"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { allowedNextStatuses } from "@/lib/orders/status";
import DashboardShell from "@/components/dashboard/DashboardShell";
import PaymentBadge from "@/components/dashboard/PaymentBadge";
import OrderStatusBadge from "@/components/dashboard/OrderStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Star, User, Truck, Receipt, Package, Calendar, Pencil } from "lucide-react";

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "IN_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params?.locale || "ar";
  const orderId = params.id;
  const t = useTranslations("Dashboard");

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const statusLabels = {
    PENDING: t("pending"),
    CONFIRMED: t("confirmed"),
    PROCESSING: t("processing"),
    IN_DELIVERY: t("inDelivery"),
    DELIVERED: t("delivered"),
    CANCELLED: t("cancelled"),
  };

  const getStatusStyles = (status) => {
    switch(status) {
      case "PENDING": return { bg: "#fdf8e6", color: "#ca8a04", border: "#fef08a" };
      case "CONFIRMED": return { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" };
      case "PROCESSING": return { bg: "#faf5ff", color: "#9333ea", border: "#e9d5ff" };
      case "IN_DELIVERY": return { bg: "#fff7ed", color: "#ea580c", border: "#fed7aa" };
      case "DELIVERED": return { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" };
      case "CANCELLED": return { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" };
      default: return { bg: "#fff", color: "#1a1a2e", border: "#ced4da" };
    }
  };

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        console.error("Failed to fetch order");
      }
    } catch (error) {
      console.error("Failed to fetch order:", error);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) fetchOrder();
  }, [orderId, fetchOrder]);

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "فشل تحديث الحالة. تأكد من الصلاحيات.");
      }
    } catch (error) {
      console.error("Failed to update order status:", error);
      setErrorMsg("حدث خطأ في الاتصال بالشبكة.");
    } finally {
      setUpdating(false);
    }
  };

  const startEditingNotes = () => {
    setNotesInput(order?.notes || "");
    setEditingNotes(true);
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesInput }),
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
        setEditingNotes(false);
      } else {
        alert("Failed to update notes");
      }
    } catch (error) {
      console.error("Failed to update notes:", error);
    } finally {
      setSavingNotes(false);
    }
  };

  const formatCurrency = (amount) => {
    return `$${Number(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ar-SA", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <DashboardShell title={t("orders")}>
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-60 rounded-xl" />
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
      title={`${t("orders")} #${order.id.slice(-6).toUpperCase()}`}
      description={t("placedOn", { date: formatDate(order.createdAt) })}
      action={
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button 
            onClick={() => router.push(`/${locale}/dashboard/orders/${orderId}/edit`)}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1.25rem", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "9999px", fontSize: "0.875rem", fontWeight: 700, color: "#2563eb", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", cursor: "pointer", transition: "all 0.2s ease" }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#dbeafe"; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#eff6ff"; }}
          >
            <Pencil style={{ width: "1rem", height: "1rem" }} />
            {t("editOrder")}
          </button>
          <button 
            onClick={() => router.push(`/${locale}/dashboard/orders`)}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1.25rem", backgroundColor: "#fff", border: "1px solid #e9ecef", borderRadius: "9999px", fontSize: "0.875rem", fontWeight: 700, color: "#1a1a2e", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", cursor: "pointer", transition: "all 0.2s ease" }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = "#f8f9fa"; e.currentTarget.style.borderColor = "#ced4da"; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = "#fff"; e.currentTarget.style.borderColor = "#e9ecef"; }}
          >
            <ArrowLeft style={{ width: "1rem", height: "1rem" }} />
            {t("back")}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Info */}
        <div style={{ borderRadius: "1rem", border: "1px solid #e9ecef", backgroundColor: "#fff", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "1.5rem 1.5rem 1rem", borderBottom: "1px solid #f1f3f5", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <User style={{ color: "#6c757d", width: "1.25rem", height: "1.25rem" }} />
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#1a1a2e", margin: 0 }}>{t("customerInfo")}</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f3f5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.875rem", color: "#6c757d", fontWeight: 600 }}>{t("name")}</span>
              <span style={{ fontSize: "1rem", color: "#1a1a2e", fontWeight: 700 }}>{order.user?.name || "—"}</span>
            </div>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f3f5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.875rem", color: "#6c757d", fontWeight: 600 }}>{t("email")}</span>
              <span style={{ fontSize: "1rem", color: "#1a1a2e", fontWeight: 700, direction: "ltr", textAlign: "right" }}>{order.user?.email || "—"}</span>
            </div>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f3f5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.875rem", color: "#6c757d", fontWeight: 600 }}>{t("phone")}</span>
              <span style={{ fontSize: "1rem", color: "#1a1a2e", fontWeight: 700, direction: "ltr", textAlign: "right" }}>{order.user?.phone || "—"}</span>
            </div>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f3f5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.875rem", color: "#6c757d", fontWeight: 600 }}>{t("orderPhone")}</span>
              <span style={{ fontSize: "1rem", color: "#1a1a2e", fontWeight: 700, direction: "ltr", textAlign: "right" }}>{order.phone || "—"}</span>
            </div>
            <div style={{ padding: "1.25rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
              <span style={{ fontSize: "0.875rem", color: "#6c757d", fontWeight: 600, flexShrink: 0 }}>{t("deliveryLocation")}</span>
              <span style={{ fontSize: "0.875rem", color: "#1a1a2e", fontWeight: 600, textAlign: "right", wordBreak: "break-word" }}>{order.location || t("noLocation")}</span>
            </div>
          </div>
        </div>

        {/* Order Status & Delivery */}
        <div style={{ borderRadius: "1rem", border: "1px solid #e9ecef", backgroundColor: "#fff", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "1.5rem 1.5rem 1rem", borderBottom: "1px solid #f1f3f5", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Truck style={{ color: "#6c757d", width: "1.25rem", height: "1.25rem" }} />
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#1a1a2e", margin: 0 }}>{t("statusDelivery")}</h2>
          </div>
          <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.875rem", color: "#6c757d", fontWeight: 600 }}>{t("currentStatus")}</span>
              <div><OrderStatusBadge status={order.status} /></div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1a1a2e" }}>{t("updateStatus")}</label>
              <div style={{ position: "relative" }}>
                <select
                  value={order.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={updating}
                  style={{ width: "100%", appearance: "none", WebkitAppearance: "none", MozAppearance: "none", borderRadius: "0.5rem", border: `1px solid ${updating ? "#ced4da" : getStatusStyles(order.status).border}`, backgroundColor: updating ? "#f8f9fa" : getStatusStyles(order.status).bg, padding: "0.75rem 1rem 0.75rem 2.5rem", fontSize: "0.875rem", outline: "none", color: updating ? "#6c757d" : getStatusStyles(order.status).color, fontWeight: 700, cursor: updating ? "wait" : "pointer", transition: "all 0.2s ease" }}
                >
                  {ORDER_STATUSES.filter(
                  (s) => s === order.status || allowedNextStatuses(order.status).includes(s)
                ).map((s) => (
                    <option key={s} value={s}>
                      {statusLabels[s] || s}
                    </option>
                  ))}
                </select>
                <div style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: "1rem", pointerEvents: "none", display: "flex", alignItems: "center" }}>
                  {updating ? (
                    <svg className="animate-spin" style={{ height: "1.25rem", width: "1.25rem", color: "#3b82f6" }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <svg style={{ height: "1.25rem", width: "1.25rem", color: getStatusStyles(order.status).color }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  )}
                </div>
              </div>
              {errorMsg && (
                <div style={{ marginTop: "0.5rem", padding: "0.5rem", backgroundColor: "#fee2e2", border: "1px solid #fecaca", borderRadius: "0.375rem" }}>
                  <p style={{ fontSize: "0.75rem", color: "#dc2626", margin: 0, fontWeight: 600 }}>{errorMsg}</p>
                </div>
              )}
            </div>

            <div style={{ paddingTop: "1.5rem", borderTop: "1px solid #e9ecef" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                <span style={{ fontSize: "0.875rem", color: "#6c757d", fontWeight: 600 }}>{t("estimatedDelivery")}</span>
                <span style={{ fontSize: "0.875rem", color: "#1a1a2e", fontWeight: 600 }}>{formatDate(order.estimatedDelivery)}</span>
              </div>
              {order.deliveredAt && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
                  <span style={{ fontSize: "0.875rem", color: "#10b981", fontWeight: 600 }}>{t("deliveredAt")}</span>
                  <span style={{ fontSize: "0.875rem", color: "#10b981", fontWeight: 700 }}>{formatDate(order.deliveredAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div style={{ borderRadius: "1rem", border: "1px solid #e9ecef", backgroundColor: "#fff", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "1.5rem 1.5rem 1rem", borderBottom: "1px solid #f1f3f5", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Receipt style={{ color: "#6c757d", width: "1.25rem", height: "1.25rem" }} />
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#1a1a2e", margin: 0 }}>{t("orderSummary")}</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f3f5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.875rem", color: "#6c757d", fontWeight: 600 }}>{t("items")}</span>
              <span style={{ fontSize: "0.875rem", color: "#1a1a2e", fontWeight: 700 }}>{order.items?.length || 0}</span>
            </div>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f3f5", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
              <span style={{ fontSize: "0.875rem", color: "#6c757d", fontWeight: 600 }}>{t("paymentStatus")}</span>
              <PaymentBadge order={order} />
            </div>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f3f5", backgroundColor: "#f8f9fa", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.875rem", color: "#1a1a2e", fontWeight: 700 }}>{t("total")}</span>
              <span style={{ fontSize: "1.25rem", color: "#1a1a2e", fontWeight: 800, direction: "ltr" }}>{formatCurrency(order.total)}</span>
            </div>
            <div style={{ padding: "1.5rem", marginTop: "auto", borderTop: "1px solid #f1f3f5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "#495057", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <svg style={{ width: "1.25rem", height: "1.25rem", color: "#adb5bd" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t("notes")}
                </p>
                {!editingNotes && (
                  <button onClick={startEditingNotes} style={{ backgroundColor: "transparent", border: "none", color: "#3b82f6", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer", padding: 0 }}>
                    {order.notes ? t("edit") || "تعديل" : t("addNote") || "إضافة ملاحظة"}
                  </button>
                )}
              </div>

              {editingNotes ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <textarea
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    disabled={savingNotes}
                    rows={3}
                    style={{ width: "100%", borderRadius: "0.5rem", border: "1px solid #ced4da", padding: "0.75rem", fontSize: "0.875rem", outline: "none", resize: "vertical", fontFamily: "inherit", color: "#1a1a2e" }}
                    placeholder={t("enterNote") || "اكتب ملاحظتك هنا..."}
                  />
                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                    <button onClick={() => setEditingNotes(false)} disabled={savingNotes} style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", border: "1px solid #ced4da", backgroundColor: "#fff", color: "#495057", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}>
                      {t("cancel") || "إلغاء"}
                    </button>
                    <button onClick={handleSaveNotes} disabled={savingNotes} style={{ padding: "0.5rem 1rem", borderRadius: "0.5rem", border: "none", backgroundColor: "#3b82f6", color: "#fff", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {savingNotes && (
                        <svg className="animate-spin" style={{ height: "1rem", width: "1rem", color: "#fff" }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      )}
                      {t("save") || "حفظ"}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ backgroundColor: "#f8f9fa", borderRight: "4px solid #adb5bd", borderRadius: "0.5rem 0 0 0.5rem", padding: "1rem 1.25rem" }}>
                  {order.notes ? (
                    <p dir="auto" style={{ fontSize: "0.875rem", color: "#212529", margin: 0, lineHeight: 1.6, fontStyle: "italic" }}>
                      "{order.notes}"
                    </p>
                  ) : (
                    <p style={{ fontSize: "0.875rem", color: "#adb5bd", margin: 0, fontStyle: "italic" }}>
                      {t("noNotes") || "لا توجد ملاحظات على هذا الطلب."}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div style={{ marginTop: "1.5rem", borderRadius: "1rem", border: "1px solid #e9ecef", backgroundColor: "#fff", boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "1.5rem 1.5rem 1rem", borderBottom: "1px solid #f1f3f5", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Package style={{ color: "#6c757d", width: "1.25rem", height: "1.25rem" }} />
          <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#1a1a2e", margin: 0 }}>{t("orderItems")}</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {order.items?.map((item, idx) => (
            <div
              key={item.id}
              style={{ padding: "1.5rem", borderBottom: idx !== order.items.length - 1 ? "1px solid #f1f3f5" : "none", display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{ height: "4rem", width: "4rem", borderRadius: "0.5rem", border: "1px solid #e9ecef", backgroundColor: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center", padding: "0.25rem", flexShrink: 0 }}>
                  {item.product?.images?.[0] ? (
                    <img
                      src={item.product.images[0]}
                      alt={item.product.titleAr || item.product.titleEn}
                      style={{ height: "100%", width: "100%", objectFit: "contain" }}
                    />
                  ) : (
                    <span style={{ fontSize: "0.625rem", color: "#adb5bd" }}>{t("noImg")}</span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontWeight: 700, color: "#1a1a2e", fontSize: "1rem", marginBottom: "0.25rem" }}>
                    {item.product?.titleAr || item.product?.titleEn || t("unknownProduct")}
                  </span>
                  <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.875rem", color: "#6c757d", fontWeight: 500 }}>
                    <span>{t("quantity")}: {item.quantity}</span>
                    {item.size && <span>{t("size")}: {item.size}</span>}
                    {item.color && <span>{t("color")}: {item.color}</span>}
                  </div>
                </div>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
                <span style={{ fontWeight: 800, fontSize: "1.125rem", color: "#1a1a2e", direction: "ltr" }}>{formatCurrency(item.price * item.quantity)}</span>
                <span style={{ fontSize: "0.75rem", color: "#6c757d", fontWeight: 500, direction: "ltr", marginTop: "0.25rem" }}>
                  {formatCurrency(item.price)} {t("each")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Feedback (shown if delivered and feedback exists) */}
      {order.status === "DELIVERED" && (order.rating || order.feedback) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">{t("customerFeedback")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.rating && (
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < order.rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-200"
                    }`}
                  />
                ))}
                <span className="ms-2 text-sm text-gray-500">
                  {order.rating}/5
                </span>
              </div>
            )}
            {order.feedback && (
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 italic">
                &ldquo;{order.feedback}&rdquo;
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </DashboardShell>
  );
}
