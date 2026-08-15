"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

/** Stop polling after this long and tell the user their money is safe. */
const POLL_DEADLINE_MS = 60_000;
const POLL_INTERVAL_MS = 2_000;

/**
 * Landing page after Wayle redirects the payer back.
 *
 * The redirect and the webhook are NOT synchronised — the payer arrives here
 * 5-20s before fulfilment happens. So this polls the ownership-checked status
 * endpoint and never claims success until the webhook has confirmed it.
 */
export default function PaymentReturn() {
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = params?.locale || "ar";
  const t = useTranslations("checkout");

  // Captured once: the effect below strips it from the URL immediately.
  const referenceRef = useRef(searchParams.get("referenceId"));
  const [state, setState] = useState("polling"); // polling | paid | failed | timeout
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    const reference = referenceRef.current;

    // Remove the reference from the address bar so a refresh or a shared link
    // cannot replay it.
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (!reference) {
      // NOT "timeout" — that state tells the visitor their payment was received
      // and their money is safe. Anyone who opens this URL directly, or reloads
      // after the reference was stripped, never paid at all, and reassuring them
      // about a payment that does not exist is worse than saying nothing.
      setState("none");
      return;
    }

    const controller = new AbortController();
    const startedAt = Date.now();
    let timer;

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/payments/status?ref=${encodeURIComponent(reference)}`,
          { signal: controller.signal, cache: "no-store" }
        );

        // The session can lapse while the payer is on Wayle's site. Polling on
        // regardless just span for the full minute and then claimed the payment
        // was received — say what actually needs doing instead.
        if (res.status === 401) {
          setState("signedOut");
          return;
        }

        if (res.ok) {
          const data = await res.json();
          if (data.status === "PAID") {
            setOrderId(data.orderId);
            setState("paid");
            return;
          }
          // Charged, but for an order we had already cancelled. Never show this
          // person a failure — their money did move and a human has to settle it.
          if (data.needsReview) {
            setState("timeout");
            return;
          }
          if (data.status === "FAILED" || data.status === "EXPIRED") {
            setState("failed");
            return;
          }
        }
      } catch (error) {
        if (error?.name === "AbortError") return;
        // Network blips are expected while polling — keep trying until the
        // deadline rather than showing an error the user cannot act on.
      }

      if (Date.now() - startedAt >= POLL_DEADLINE_MS) {
        setState("timeout");
        return;
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    poll();

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  const content = {
    polling: {
      icon: "⏳",
      color: "#6c757d",
      title: t("verifyingPayment"),
      desc: t("verifyingPaymentDesc"),
    },
    paid: {
      icon: "✅",
      color: "#28a745",
      title: t("paymentConfirmed"),
      desc: t("orderSuccessMsg"),
    },
    failed: {
      icon: "⚠️",
      color: "#dc3545",
      title: t("paymentFailed"),
      desc: t("paymentFailedDesc"),
    },
    // Deliberately not an error: the webhook will still land.
    timeout: {
      icon: "🕒",
      color: "#6c757d",
      title: t("paymentPendingTitle"),
      desc: t("paymentPendingDesc"),
    },
    signedOut: {
      icon: "🔐",
      color: "#6c757d",
      title: t("paymentSignedOutTitle"),
      desc: t("paymentSignedOutDesc"),
    },
    // Reached this page without a payment reference — say so plainly.
    none: {
      icon: "🔎",
      color: "#6c757d",
      title: t("noPaymentFound"),
      desc: t("noPaymentFoundDesc"),
    },
  }[state];

  return (
    <section className="flat-spacing">
      <div className="container">
        <div className="text-center" style={{ maxWidth: "520px", margin: "0 auto" }}>
          <div style={{ fontSize: "56px", marginBottom: "16px" }} aria-hidden="true">
            {content.icon}
          </div>
          <h4 style={{ color: content.color, marginBottom: "12px" }}>
            {content.title}
          </h4>
          <p style={{ marginBottom: "28px" }}>{content.desc}</p>

          {state === "paid" && orderId && (
            <p style={{ marginBottom: "20px" }}>
              {/* Same derivation as the order page's own heading. This showed
                  the LAST 8 characters in lower case while the order page shows
                  the FIRST 8 upper-cased, so the number a customer was given
                  here matched nothing they could find afterwards. */}
              {t("orderNumber")}:{" "}
              <strong dir="ltr">#{String(orderId).slice(0, 8).toUpperCase()}</strong>
            </p>
          )}

          {state !== "polling" && (
            <div className="d-flex justify-content-center" style={{ gap: "12px", flexWrap: "wrap" }}>
              {/* Straight to the order that was just paid for. Previously the
                  only link was to the whole order list, so a customer who had
                  just paid had to identify their own order by eye — and the
                  reference shown above did not help them do it. */}
              {state === "paid" && orderId ? (
                <Link
                  href={`/${locale}/my-orders/${orderId}`}
                  className="tf-btn btn-reset"
                >
                  {t("viewYourOrder")}
                </Link>
              ) : (
                <Link href={`/${locale}/my-orders`} className="tf-btn btn-reset">
                  {t("backToOrders")}
                </Link>
              )}
              <Link href={`/${locale}/shop-default-grid`} className="tf-btn btn-outline">
                {t("goToShop")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
