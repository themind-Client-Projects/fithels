"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import CurrencyFormatter from "@/components/common/CurrencyFormatter";

const STATUS_COLORS = {
  PENDING: "bg-warning bg-opacity-10 text-warning",
  CONFIRMED: "text-primary",
  PROCESSING: "text-info",
  IN_DELIVERY: "text-indigo",
  DELIVERED: "text-success",
  CANCELLED: "text-danger",
};

export default function MyOrdersList() {
  const { data: session, status } = useSession();
  const isLoaded = status !== "loading";
  const isSignedIn = status === "authenticated";
  const params = useParams();
  const locale = params?.locale || "ar";
  const t = useTranslations("myOrders");
  const tStatus = useTranslations("status");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    async function fetchOrders() {
      try {
        const res = await fetch("/api/orders");
        if (res.ok) {
          const data = await res.json();
          setOrders(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to fetch orders:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [isLoaded, isSignedIn]);

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
        <div className="container text-center py-5">
          <p>يرجى تسجيل الدخول لعرض طلباتك</p>
        </div>
      </section>
    );
  }

  if (orders.length === 0) {
    return (
      <section className="flat-spacing">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xl-6 text-center" style={{ padding: "60px 20px" }}>
              <div style={{ fontSize: "64px", marginBottom: "20px" }}>📦</div>
              <h4 style={{ marginBottom: "12px" }}>{t("noOrders")}</h4>
              <p className="text-secondary" style={{ marginBottom: "30px" }}>
                {t("noOrdersDesc")}
              </p>
              <Link href={`/${locale}/shop-default-grid`} className="tf-btn btn-reset">
                {t("startShopping")}
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flat-spacing">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-8">
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {orders.map((order) => (
                <div
                  key={order.id}
                  style={{
                    background: "#fff",
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    padding: "20px 24px",
                    transition: "box-shadow 0.2s",
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start" style={{ marginBottom: "12px" }}>
                    <div>
                      <span className="text-secondary" style={{ fontSize: "13px" }}>
                        {t("orderNumber")}
                      </span>
                      <div style={{ fontFamily: "monospace", fontWeight: 600, fontSize: "15px" }}>
                        #{order.id.slice(0, 8).toUpperCase()}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "13px",
                        fontWeight: 600,
                        background: order.status === "DELIVERED" ? "#f0fdf4" : order.status === "CANCELLED" ? "#fef2f2" : "#f8fafc",
                        color: order.status === "DELIVERED" ? "#166534" : order.status === "CANCELLED" ? "#991b1b" : "#475569",
                        border: `1px solid ${order.status === "DELIVERED" ? "#bbf7d0" : order.status === "CANCELLED" ? "#fecaca" : "#e2e8f0"}`,
                      }}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center" style={{ marginBottom: "8px" }}>
                    <span className="text-secondary" style={{ fontSize: "13px" }}>
                      {new Date(order.createdAt).toLocaleDateString("ar-SA", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: "16px" }}>
                      <CurrencyFormatter price={order.total} />
                    </span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center" style={{ marginTop: "12px" }}>
                    <span className="text-secondary" style={{ fontSize: "13px" }}>
                      {order.items?.length || 0} {t("items")}
                    </span>
                    <Link
                      href={`/${locale}/my-orders/${order.id}`}
                      className="text-button"
                      style={{ fontSize: "14px", textDecoration: "underline" }}
                    >
                      {t("viewDetails")} →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
