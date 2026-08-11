"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import CurrencyFormatter from "@/components/common/CurrencyFormatter";

/** Delivery lifecycle, in order. CANCELLED sits outside it. */
const DELIVERY_STEPS = ["PENDING", "CONFIRMED", "PROCESSING", "IN_DELIVERY", "DELIVERED"];

/**
 * Plain-language answer to "where is my order?".
 *
 * The raw OrderStatus enum is warehouse vocabulary; a shopper wants to know
 * whether it has shipped, is on its way, or has arrived.
 */
function deliveryState(status, t) {
  if (status === "CANCELLED") return { label: t("orderCancelled"), tone: "#dc2626", bg: "#fef2f2", icon: "✕" };
  if (status === "DELIVERED") return { label: t("received"), tone: "#059669", bg: "#ecfdf5", icon: "✓" };
  if (status === "IN_DELIVERY") return { label: t("onTheWay"), tone: "#ea580c", bg: "#fff7ed", icon: "🚚" };
  return { label: t("awaitingShipping"), tone: "#6b7280", bg: "#f8fafc", icon: "⏳" };
}

function paymentState(order, t) {
  const online = order.paymentMethod === "WAYLE";
  const paid = order.paymentStatus === "PAID";
  return {
    method: online ? `💳 ${t("onlinePayment")}` : `💵 ${t("cashOnDelivery")}`,
    label: paid ? t("paid") : t("awaitingPayment"),
    tone: paid ? "#059669" : "#b45309",
  };
}

const card = {
  background: "#fff",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  padding: "24px",
};

export default function AccountOverview() {
  const { data: session, status } = useSession();
  const isLoaded = status !== "loading";
  const isSignedIn = status === "authenticated";
  const params = useParams();
  const locale = params?.locale || "ar";
  const t = useTranslations("myOrders");
  const tStatus = useTranslations("status");
  const tCommon = useTranslations("common");

  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const [ordersRes, meRes] = await Promise.all([
        fetch("/api/orders?limit=100", { cache: "no-store" }),
        fetch("/api/auth/me", { cache: "no-store" }),
      ]);
      if (!ordersRes.ok) throw new Error("orders");
      const payload = await ordersRes.json();
      const list = Array.isArray(payload) ? payload : payload?.data;
      setOrders(Array.isArray(list) ? list : []);
      if (meRes.ok) setProfile(await meRes.json());
    } catch (err) {
      console.error("Failed to load account:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    // Clear loading for signed-out visitors too, or the guard below never
    // renders and they sit on a spinner forever.
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    load();
  }, [isLoaded, isSignedIn, load, reloadToken]);

  if (!isLoaded || loading) {
    return (
      <section className="flat-spacing">
        <div className="container text-center py-5">
          <div className="spinner-border text-secondary" role="status" />
        </div>
      </section>
    );
  }

  if (!isSignedIn) {
    return (
      <section className="flat-spacing">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xl-6 text-center" style={{ padding: "60px 20px" }}>
              <div style={{ fontSize: "64px", marginBottom: "20px" }}>👤</div>
              <h4 style={{ marginBottom: "12px" }}>{t("signInToView")}</h4>
              <p className="text-secondary" style={{ marginBottom: "30px" }}>
                {t("signInToViewDesc")}
              </p>
              <Link href={`/${locale}`} className="tf-btn btn-reset">
                {tCommon("backToHome")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="flat-spacing">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xl-6 text-center" style={{ padding: "60px 20px" }}>
              <div style={{ fontSize: "64px", marginBottom: "20px" }}>⚠️</div>
              <h4 style={{ marginBottom: "12px" }}>{tCommon("error")}</h4>
              <button
                className="tf-btn btn-reset"
                onClick={() => {
                  setLoading(true);
                  setReloadToken((n) => n + 1);
                }}
              >
                {tCommon("retry")}
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const active = orders.filter(
    (o) => o.status !== "DELIVERED" && o.status !== "CANCELLED"
  ).length;
  // Only count orders that were actually collected — pending and cancelled
  // orders are not money the customer has spent.
  const spent = orders
    .filter((o) => o.paymentStatus === "PAID")
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const stats = [
    { label: t("totalOrders"), value: orders.length },
    { label: t("activeOrders"), value: active },
    { label: t("totalSpent"), value: <CurrencyFormatter price={spent} /> },
  ];

  return (
    <section className="flat-spacing">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-9" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Profile */}
            <div style={card}>
              <h6 style={{ marginBottom: "16px" }}>{t("profile")}</h6>
              <div style={{ display: "grid", gap: "10px" }}>
                {[
                  [t("fullName"), profile?.name],
                  [t("emailLabel"), profile?.email],
                  [t("phoneLabel"), profile?.phone],
                ].map(([label, value]) => (
                    <div key={label} className="d-flex justify-content-between" style={{ gap: "12px" }}>
                      <span className="text-secondary" style={{ fontSize: "14px" }}>{label}</span>
                      <span style={{ fontWeight: 600 }}>{value || t("notProvided")}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px" }}>
              {stats.map((s) => (
                <div key={s.label} style={{ ...card, textAlign: "center" }}>
                  <div className="text-secondary" style={{ fontSize: "13px", marginBottom: "6px" }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: "22px", fontWeight: 700 }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Recent orders with payment + delivery state */}
            <div style={card}>
              <div className="d-flex justify-content-between align-items-center" style={{ marginBottom: "16px" }}>
                <h6 style={{ margin: 0 }}>{t("recentOrders")}</h6>
                <Link href={`/${locale}/my-orders`} className="text-button" style={{ fontSize: "14px", textDecoration: "underline" }}>
                  {t("viewAllOrders")} →
                </Link>
              </div>

              {orders.length === 0 ? (
                <div className="text-center" style={{ padding: "30px 0" }}>
                  <div style={{ fontSize: "48px", marginBottom: "12px" }}>📦</div>
                  <p className="text-secondary" style={{ marginBottom: "20px" }}>{t("noOrdersDesc")}</p>
                  <Link href={`/${locale}/shop-default-grid`} className="tf-btn btn-reset">
                    {t("startShopping")}
                  </Link>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {orders.slice(0, 5).map((order) => {
                    const d = deliveryState(order.status, t);
                    const p = paymentState(order, t);
                    const stepIndex = DELIVERY_STEPS.indexOf(order.status);
                    return (
                      <div key={order.id} style={{ border: "1px solid #eef0f3", borderRadius: "12px", padding: "16px" }}>
                        <div className="d-flex justify-content-between align-items-start flex-wrap" style={{ gap: "10px" }}>
                          <div>
                            <div style={{ fontFamily: "monospace", fontWeight: 700 }}>
                              #{order.id.slice(0, 8).toUpperCase()}
                            </div>
                            <div className="text-secondary" style={{ fontSize: "13px" }}>
                              {new Date(order.createdAt).toLocaleDateString(locale === "ar" ? "ar" : "en-GB", {
                                year: "numeric", month: "long", day: "numeric",
                              })}
                            </div>
                          </div>
                          <div style={{ textAlign: "end" }}>
                            <div style={{ fontWeight: 700 }}>
                              <CurrencyFormatter price={order.total} />
                            </div>
                            <div style={{ fontSize: "12px", color: p.tone, fontWeight: 600 }}>
                              {p.method} · {p.label}
                            </div>
                          </div>
                        </div>

                        {/* Delivery state, in words a shopper understands */}
                        <div className="d-flex align-items-center flex-wrap" style={{ gap: "10px", marginTop: "12px" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: "6px",
                            background: d.bg, color: d.tone, border: `1px solid ${d.tone}22`,
                            borderRadius: "9999px", padding: "4px 12px", fontSize: "13px", fontWeight: 700,
                          }}>
                            <span aria-hidden="true">{d.icon}</span> {d.label}
                          </span>
                          <span className="text-secondary" style={{ fontSize: "12px" }}>
                            {tStatus(
                              { PENDING: "pending", CONFIRMED: "confirmed", PROCESSING: "processing",
                                IN_DELIVERY: "inDelivery", DELIVERED: "delivered", CANCELLED: "cancelled" }[order.status]
                              || "pending"
                            )}
                          </span>
                        </div>

                        {/* Progress, hidden for cancelled orders where it is meaningless */}
                        {order.status !== "CANCELLED" && (
                          <div style={{ display: "flex", gap: "4px", marginTop: "12px" }} aria-hidden="true">
                            {DELIVERY_STEPS.map((step, i) => (
                              <span key={step} style={{
                                flex: 1, height: "4px", borderRadius: "2px",
                                background: i <= stepIndex ? d.tone : "#e5e7eb",
                              }} />
                            ))}
                          </div>
                        )}

                        <div style={{ marginTop: "12px" }}>
                          <Link href={`/${locale}/my-orders/${order.id}`} className="text-button"
                            style={{ fontSize: "14px", textDecoration: "underline" }}>
                            {t("viewDetails")} →
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
