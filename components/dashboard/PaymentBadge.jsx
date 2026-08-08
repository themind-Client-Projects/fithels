"use client";

import { useTranslations } from "next-intl";

const PAYMENT_STATUS_STYLES = {
  UNPAID: { bg: "#f8f9fa", color: "#6c757d", border: "#dee2e6", key: "payUnpaid" },
  PENDING: { bg: "#fdf8e6", color: "#ca8a04", border: "#fef08a", key: "payPending" },
  PROCESSING: { bg: "#faf5ff", color: "#9333ea", border: "#e9d5ff", key: "payProcessing" },
  PAID: { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0", key: "payPaid" },
  FAILED: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca", key: "payFailed" },
  EXPIRED: { bg: "#fef2f2", color: "#b45309", border: "#fed7aa", key: "payExpired" },
};

/**
 * Payment method + status for an order.
 *
 * Until this existed no dashboard view read paymentStatus, paymentMethod or
 * paymentIntent at all — so staff could not tell a paid online order from an
 * unpaid cash one, and the reconciliation flags the webhook writes when money
 * arrives for a cancelled or expired order had no human surface anywhere.
 */
export default function PaymentBadge({ order, showMethod = true }) {
  const t = useTranslations("Dashboard");

  const style =
    PAYMENT_STATUS_STYLES[order?.paymentStatus] || PAYMENT_STATUS_STYLES.UNPAID;

  const isOnline = order?.paymentMethod === "WAYLE";
  const needsReview = Boolean(
    order?.paymentIntent?.failureReason &&
      /NEEDS_RECONCILIATION|NEEDS_REVIEW/.test(order.paymentIntent.failureReason)
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "flex-start" }}>
      {showMethod && (
        <span style={{ fontSize: "0.75rem", color: "#6c757d", fontWeight: 600 }}>
          {isOnline ? `💳 ${t("onlinePayment")}` : `💵 ${t("cashOnDelivery")}`}
        </span>
      )}
      <span
        style={{
          display: "inline-block",
          borderRadius: "9999px",
          padding: "0.2rem 0.6rem",
          fontSize: "0.7rem",
          fontWeight: 700,
          backgroundColor: style.bg,
          color: style.color,
          border: `1px solid ${style.border}`,
        }}
      >
        {t(style.key)}
      </span>
      {needsReview && (
        <span
          title={t("needsReconciliationDesc")}
          style={{
            display: "inline-block",
            borderRadius: "9999px",
            padding: "0.2rem 0.6rem",
            fontSize: "0.7rem",
            fontWeight: 700,
            backgroundColor: "#fff7ed",
            color: "#c2410c",
            border: "1px solid #fed7aa",
          }}
        >
          ⚠ {t("needsReconciliation")}
        </span>
      )}
    </div>
  );
}
