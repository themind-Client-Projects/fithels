"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { coverFor } from "@/lib/products/colorImages";
import CurrencyFormatter from "@/components/common/CurrencyFormatter";
import ReorderButton from "@/components/my-account/ReorderButton";
import { Clock, CheckCircle2, Package, Truck, Home, Check } from "lucide-react";
import { orderLabel } from "@/lib/orders/reference";

const STATUS_STEPS = ["PENDING", "CONFIRMED", "PROCESSING", "IN_DELIVERY", "DELIVERED"];

/** One entry per PaymentStatus in the Prisma enum — none may fall through. */
const PAYMENT_STATE = {
  UNPAID:     { key: "awaitingPayment",   color: "#b45309" },
  PENDING:    { key: "paymentPending",    color: "#b45309" },
  PROCESSING: { key: "paymentProcessing", color: "#b45309" },
  PAID:       { key: "paid",              color: "#28a745" },
  FAILED:     { key: "paymentFailed",     color: "#dc2626" },
  EXPIRED:    { key: "paymentExpired",    color: "#dc2626" },
};

export default function OrderTracking({ orderId }) {
  const { data: session, status } = useSession();
  const isLoaded = status !== "loading";
  const isSignedIn = status === "authenticated";
  const params = useParams();
  const locale = params?.locale || "ar";
  const t = useTranslations("myOrders");
  const tStatus = useTranslations("status");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isLoaded) return;
    // Without this a signed-out visitor spun forever: `loading` was never
    // cleared and this component has no signed-out branch of its own.
    if (!isSignedIn || !orderId) {
      setError("unauthenticated");
      setLoading(false);
      return;
    }

    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${orderId}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setOrder(data);
        } else {
          setError("not_found");
        }
      } catch (err) {
        console.error("Failed to fetch order:", err);
        setError("error");
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [isLoaded, isSignedIn, orderId]);

  const getStatusLabel = (status) => {
    const map = {
      PENDING: tStatus("pending"),
      CONFIRMED: tStatus("confirmed"),
      PROCESSING: tStatus("processing"),
      IN_DELIVERY: tStatus("inDelivery"),
      DELIVERED: tStatus("delivered"),
      CANCELLED: tStatus("cancelled"),
    };
    return map[status] || status;
  };

  // Real icons rather than emoji: emoji render differently on every platform,
  // do not inherit currentColor, and sat next to a plain grey box for the steps
  // that had not happened yet.
  const STEP_ICONS = {
    PENDING: Clock,
    CONFIRMED: CheckCircle2,
    PROCESSING: Package,
    IN_DELIVERY: Truck,
    DELIVERED: Home,
  };

  if (!isLoaded || loading) {
    return (
      <section className="flat-spacing">
        <div className="container text-center py-5">
          <div className="spinner-border text-secondary" role="status" />
        </div>
      </section>
    );
  }

  if (error || !order) {
    return (
      <section className="flat-spacing">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xl-6 text-center" style={{ padding: "60px 20px" }}>
              <div style={{ fontSize: "64px", marginBottom: "20px" }}>🔍</div>
              <h4 style={{ marginBottom: "12px" }}>{t("orderNotFound")}</h4>
              <p className="text-secondary" style={{ marginBottom: "30px" }}>
                {t("orderNotFoundDesc")}
              </p>
              <Link href={`/${locale}/my-orders`} className="tf-btn btn-reset">
                {t("backToOrders")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const isCancelled = order.status === "CANCELLED";
  const currentStepIndex = STATUS_STEPS.indexOf(order.status);

  return (
    <section className="flat-spacing">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-8">
            {/* Back link */}
            <Link
              href={`/${locale}/my-orders`}
              className="text-button"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "24px", textDecoration: "none" }}
            >
              ← {t("backToOrders")}
            </Link>

            {/* Order header */}
            <div
              style={{
                background: "#fff",
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                padding: "24px",
                marginBottom: "20px",
              }}
            >
              <div className="d-flex justify-content-between align-items-start" style={{ marginBottom: "16px" }}>
                <div>
                  <span className="text-secondary" style={{ fontSize: "13px" }}>{t("orderNumber")}</span>
                  <h5 style={{ fontFamily: "monospace", marginTop: "4px" }}>
                    {orderLabel(order.id)}
                  </h5>
                </div>
                <span
                  style={{
                    padding: "6px 16px",
                    borderRadius: "24px",
                    fontSize: "14px",
                    fontWeight: 700,
                    background: isCancelled ? "#fef2f2" : order.status === "DELIVERED" ? "#f0fdf4" : "#f0f9ff",
                    color: isCancelled ? "#991b1b" : order.status === "DELIVERED" ? "#166534" : "#1e40af",
                    border: `1px solid ${isCancelled ? "#fecaca" : order.status === "DELIVERED" ? "#bbf7d0" : "#bfdbfe"}`,
                  }}
                >
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <div className="text-secondary" style={{ fontSize: "14px" }}>
                {new Date(order.createdAt).toLocaleDateString("ar-SA", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>

            {/* Order Timeline */}
            {!isCancelled && (
              <div
                style={{
                  background: "#fff",
                  borderRadius: "16px",
                  border: "1px solid #e5e7eb",
                  padding: "28px 24px",
                  marginBottom: "20px",
                }}
              >
                <h6 style={{ marginBottom: "24px" }}>{t("orderTimeline")}</h6>
                <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                  {STATUS_STEPS.map((step, index) => {
                    const isCompleted = index <= currentStepIndex;
                    const isCurrent = index === currentStepIndex;
                    const isLast = index === STATUS_STEPS.length - 1;

                    return (
                      <div key={step} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                        {/* Timeline dot + line */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "40px" }}>
                          <div
                            style={{
                              width: isCurrent ? "40px" : "32px",
                              height: isCurrent ? "40px" : "32px",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: isCompleted ? (isCurrent ? "#2563eb" : "#dbeafe") : "#f1f5f9",
                              border: isCurrent ? "3px solid #bfdbfe" : "2px solid #e2e8f0",
                              color: isCurrent ? "#fff" : isCompleted ? "#2563eb" : "#cbd5e1",
                              boxShadow: isCurrent ? "0 0 0 4px rgba(37,99,235,0.12)" : "none",
                              transition: "all 0.25s ease",
                              flexShrink: 0,
                            }}
                          >
                            {(() => {
                              const Icon = STEP_ICONS[step] || Clock;
                              // A completed step that is behind the current one
                              // reads better as a tick than as its own glyph.
                              const Glyph = isCompleted && !isCurrent ? Check : Icon;
                              return <Glyph size={isCurrent ? 20 : 16} strokeWidth={2.5} aria-hidden="true" />;
                            })()}
                          </div>
                          {!isLast && (
                            <div
                              style={{
                                width: "2px",
                                height: "32px",
                                background: isCompleted && index < currentStepIndex ? "#3b82f6" : "#e2e8f0",
                                transition: "background 0.3s ease",
                              }}
                            />
                          )}
                        </div>
                        {/* Step label */}
                        <div style={{ paddingTop: isCurrent ? "8px" : "4px", paddingBottom: isLast ? "0" : "8px" }}>
                          <span
                            style={{
                              fontSize: isCurrent ? "15px" : "14px",
                              fontWeight: isCurrent ? 700 : isCompleted ? 600 : 400,
                              color: isCurrent ? "#1e40af" : isCompleted ? "#334155" : "#94a3b8",
                            }}
                          >
                            {getStatusLabel(step)}
                          </span>
                          {isCurrent && (
                            <span style={{ display: "block", fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                              {t("currentStatus")}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cancelled notice */}
            {isCancelled && (
              <div
                style={{
                  background: "#fef2f2",
                  borderRadius: "12px",
                  padding: "20px",
                  marginBottom: "20px",
                  border: "1px solid #fecaca",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "40px", marginBottom: "8px" }}>❌</div>
                <p style={{ color: "#991b1b", fontWeight: 600, margin: 0 }}>
                  {t("orderCancelled")}
                </p>
              </div>
            )}

            {/* Order Items */}
            <div
              style={{
                background: "#fff",
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                padding: "24px",
                marginBottom: "20px",
              }}
            >
              <h6 style={{ marginBottom: "16px" }}>{t("orderItems")}</h6>
              {order.items?.map((item, i) => (
                <div
                  key={i}
                  className="d-flex align-items-center"
                  style={{
                    gap: "16px",
                    padding: "12px 0",
                    borderBottom: i < order.items.length - 1 ? "1px solid #f1f5f9" : "none",
                  }}
                >
                  {coverFor(item.product?.images, item.product?.colorImages, item.color) && (
                    <Image
                      src={coverFor(item.product.images, item.product.colorImages, item.color)}
                      alt={item.product.titleAr || "product"}
                      width={60}
                      height={75}
                      style={{ objectFit: "cover", borderRadius: "8px" }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "4px" }}>
                      {item.product?.titleAr || item.product?.titleEn || t("unknownProduct")}
                    </div>
                    <div className="text-secondary" style={{ fontSize: "13px" }}>
                      {t("quantity")}: {item.quantity} × <CurrencyFormatter price={item.price} />
                      {item.size && <span> · {t("size")}: {item.size}</span>}
                      {item.color && <span> · {t("color")}: {item.color}</span>}
                    </div>
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    <CurrencyFormatter price={item.price * item.quantity} />
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div
              style={{
                background: "#fff",
                borderRadius: "16px",
                border: "1px solid #e5e7eb",
                padding: "24px",
                marginBottom: "20px",
              }}
            >
              <h6 style={{ marginBottom: "16px" }}>{t("orderSummary")}</h6>
              <div className="d-flex justify-content-between" style={{ marginBottom: "8px" }}>
                <span className="text-secondary">{t("paymentMethod")}</span>
                {/* Read the order's actual method — this used to always claim
                    cash on delivery, which is wrong for orders paid online. */}
                <span style={{ color: "#28a745", fontWeight: 600 }}>
                  {order.paymentMethod === "WAYLE"
                    ? `💳 ${t("onlinePayment")}`
                    : `💵 ${t("cashOnDelivery")}`}
                </span>
              </div>
              {order.paymentMethod === "WAYLE" && (
                <div className="d-flex justify-content-between" style={{ marginBottom: "8px" }}>
                  <span className="text-secondary">{t("paymentStatus")}</span>
                  {/* Every PaymentStatus, not just PAID vs not-PAID. Collapsing
                      them told a customer whose payment had FAILED or EXPIRED —
                      and whose order was therefore already cancelled — that
                      their payment was still being awaited, so they sat waiting
                      for something that was never going to happen. */}
                  <span style={{ fontWeight: 600, color: PAYMENT_STATE[order.paymentStatus]?.color ?? "#b45309" }}>
                    {t(PAYMENT_STATE[order.paymentStatus]?.key ?? "awaitingPayment")}
                  </span>
                </div>
              )}
              {order.notes && (
                <div className="d-flex justify-content-between" style={{ marginBottom: "8px" }}>
                  <span className="text-secondary">{t("notes")}</span>
                  <span>{order.notes}</span>
                </div>
              )}
              {/* Show the arithmetic whenever a coupon was used, so the total
                  is not just a smaller number with no explanation. Orders
                  placed before coupons existed carry discount 0 and skip it. */}
              {order.discount > 0 && (
                <>
                  <div className="d-flex justify-content-between" style={{ marginBottom: "8px" }}>
                    <span className="text-secondary">{t("subtotal")}</span>
                    <span><CurrencyFormatter price={order.subtotal} /></span>
                  </div>
                  <div className="d-flex justify-content-between" style={{ marginBottom: "8px", color: "#059669" }}>
                    <span>
                      {t("discount")}
                      {order.couponCode ? ` (${order.couponCode})` : ""}
                    </span>
                    <span>− <CurrencyFormatter price={order.discount} /></span>
                  </div>
                </>
              )}
              <hr style={{ margin: "12px 0", borderColor: "#f1f5f9" }} />
              <div className="d-flex justify-content-between">
                <h5>{t("total")}</h5>
                <h5><CurrencyFormatter price={order.total} /></h5>
              </div>

              <div style={{ marginTop: "20px" }}>
                <ReorderButton order={order} variant="block" />
              </div>
              {order.deliveredAt && (
                <div className="d-flex justify-content-between" style={{ marginTop: "8px" }}>
                  <span className="text-secondary">{t("deliveredAt")}</span>
                  <span>
                    {new Date(order.deliveredAt).toLocaleDateString("ar-SA", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
