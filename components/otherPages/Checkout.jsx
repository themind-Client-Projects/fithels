"use client";

import { useContextElement } from "@/context/Context";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useUIStore } from "@/stores/useUIStore";
import { useTranslations } from "next-intl";

function CheckoutContent() {
  const { cartProducts, totalPrice: cartTotal, setCartProducts } = useContextElement();
  const { data: session, status } = useSession();
  const isLoaded = status !== "loading";
  const isSignedIn = status === "authenticated";
  const user = session?.user;
  const { openAuth } = useUIStore();
  
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [errors, setErrors] = useState({});
  // "COD" (cash on delivery) or "WAYLE" (online payment link).
  const [paymentMethod, setPaymentMethod] = useState("COD");
  
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params?.locale || "ar";
  const t = useTranslations("checkout");
  const tShop = useTranslations("shop");

  // Single Product Checkout State
  const isSingleProduct = !!searchParams.get("product");
  const [singleProduct, setSingleProduct] = useState(null);
  const [loadingProduct, setLoadingProduct] = useState(isSingleProduct);

  // Auto-fill phone from user profile
  useEffect(() => {
    if (isSignedIn) {
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then((data) => {
          if (data.phone && !phone) setPhone(data.phone);
        })
        .catch(() => {});
    }
  }, [isSignedIn]);

  // Load single product if query param is present
  useEffect(() => {
    if (isSingleProduct) {
      const slug = searchParams.get("product");
      fetch(`/api/products/by-slug/${slug}`)
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) setSingleProduct(data);
        })
        .finally(() => setLoadingProduct(false));
    }
  }, [isSingleProduct, searchParams]);

  const handlePlaceOrder = async () => {
    if (!isSignedIn) {
      openAuth("signIn");
      return;
    }

    if (!isSingleProduct && cartProducts.length === 0) return;
    if (isSingleProduct && !singleProduct) return;

    // Validate phone and location
    const newErrors = {};
    if (!phone.trim()) newErrors.phone = true;
    if (!location.trim()) newErrors.location = true;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    setIsSubmitting(true);

    try {
      let items = [];
      if (isSingleProduct) {
        items = [{
          productId: singleProduct.id,
          quantity: parseInt(searchParams.get("qty") || "1", 10),
          size: searchParams.get("size") || undefined,
          color: searchParams.get("color") || undefined,
        }];
      } else {
        items = cartProducts.map((item) => ({
          productId: item.dbId || item.id?.toString(),
          quantity: item.quantity || 1,
          size: item.selectedSize || undefined,
          color: item.selectedColor || undefined,
        }));
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          notes: note || undefined,
          phone: phone.trim(),
          location: location.trim(),
          paymentMethod,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // Wayle's 1000 IQD floor is a product rule, not a gateway error —
        // show a localized message pointing at cash on delivery instead.
        if (err.code === "WAYLE_MIN_AMOUNT") {
          throw new Error(t("paymentBelowMinimum"));
        }
        throw new Error(err.error || "Order failed");
      }

      const order = await res.json();

      // Clear the cart before leaving the site, so returning from the payment
      // page cannot re-submit the same items.
      if (!isSingleProduct) {
        setCartProducts([]);
        localStorage.removeItem("cartList");
      }

      if (paymentMethod === "WAYLE") {
        if (!order.paymentUrl) {
          throw new Error(t("paymentFailedStart"));
        }
        // Hand off to Wayle's hosted page. The webhook confirms the payment
        // separately; /checkout/return polls for that.
        window.location.href = order.paymentUrl;
        return;
      }

      setOrderId(order.id);
      setOrderPlaced(true);
    } catch (error) {
      console.error("Order error:", error);
      alert(error.message || "فشل في تأكيد الطلب. حاول مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded || loadingProduct) {
    return (
      <section className="flat-spacing">
        <div className="container text-center">
          <p>{t("placingOrder") || "Loading..."}</p>
        </div>
      </section>
    );
  }

  // If not logged in, show message and trigger modal
  if (!isSignedIn) {
    return (
      <section className="flat-spacing">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xl-6">
              <div
                className="text-center"
                style={{
                  background: "#f8f9fa",
                  borderRadius: "16px",
                  padding: "60px 40px",
                }}
              >
                <div style={{ fontSize: "48px", marginBottom: "20px" }}>👤</div>
                <h4 style={{ marginBottom: "12px" }}>{t("createAccount")}</h4>
                <p className="text-secondary" style={{ marginBottom: "8px", lineHeight: "1.6" }}>
                  {t("createAccountDesc")}
                </p>
                <p className="text-secondary" style={{ marginBottom: "30px", lineHeight: "1.6" }}>
                  {t("contactInfo")}
                </p>
                <button onClick={() => openAuth("signUp")} className="tf-btn btn-reset" style={{ display: "inline-block", marginBottom: "16px" }}>
                  {t("createAccountBtn")}
                </button>
                <p>
                  {t("alreadyHaveAccount")}{" "}
                  <button onClick={() => openAuth("signIn")} className="text-button" style={{ textDecoration: "underline", border: "none", background: "none", padding: 0 }}>
                    {t("loginHere")}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Order success state
  if (orderPlaced) {
    return (
      <section className="flat-spacing">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xl-6">
              <div
                className="text-center"
                style={{ background: "#f0fdf4", borderRadius: "16px", padding: "60px 40px", border: "1px solid #bbf7d0" }}
              >
                <div style={{ fontSize: "64px", marginBottom: "20px" }}>✅</div>
                <h3 style={{ marginBottom: "12px", color: "#166534" }}>{t("orderSuccess")}</h3>
                <p className="text-secondary" style={{ marginBottom: "8px", lineHeight: "1.7", fontSize: "16px" }}>
                  {t("thankYou")}، <strong>{user.firstName || user.emailAddresses?.[0]?.emailAddress}</strong>!
                </p>
                <p className="text-secondary" style={{ marginBottom: "16px", lineHeight: "1.7" }}>
                  {t("orderSuccessMsg")}<br />{t("payOnDelivery")}
                </p>
                {orderId && (
                  <div style={{ background: "#fff", borderRadius: "8px", padding: "12px 20px", marginBottom: "20px", border: "1px solid #e2e8f0", display: "inline-block" }}>
                    <span className="text-secondary">{t("orderNumber")}: </span>
                    <strong style={{ fontFamily: "monospace", fontSize: "14px" }}>{orderId.slice(0, 8).toUpperCase()}</strong>
                  </div>
                )}
                <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                  {orderId && (
                    <Link href={`/${locale}/my-orders/${orderId}`} className="tf-btn btn-reset" style={{ display: "inline-block" }}>
                      {t("trackOrder")}
                    </Link>
                  )}
                  <Link href={`/${locale}/shop-default-grid`} className="tf-btn btn-reset" style={{ display: "inline-block", background: "#6b7280" }}>
                    {tShop("continueShopping")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Determine items and total to show
  let displayItems = [];
  let displayTotal = 0;

  if (isSingleProduct && singleProduct) {
    const qty = parseInt(searchParams.get("qty") || "1", 10);
    const size = searchParams.get("size");
    const color = searchParams.get("color");
    displayItems = [{
      id: singleProduct.id,
      title: locale === "ar" ? singleProduct.titleAr : singleProduct.titleEn,
      price: singleProduct.salePrice || singleProduct.price,
      quantity: qty,
      selectedSize: size,
      selectedColor: color,
      imgSrc: singleProduct.images?.[0]
    }];
    displayTotal = (singleProduct.salePrice || singleProduct.price) * qty;
  } else {
    displayItems = cartProducts;
    displayTotal = cartTotal;
  }

  return (
    <section className="flat-spacing">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-xl-7">
            <div style={{ marginBottom: "30px" }}>
              <h5 className="title" style={{ marginBottom: "16px" }}>{t("orderConfirmation")}</h5>
              <div style={{ background: "#f0f9ff", borderRadius: "12px", padding: "20px", border: "1px solid #bae6fd", display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", color: "#0ea5e9" }}>
                  👤
                </div>
                <div>
                  <h6 style={{ margin: 0, fontWeight: "600", color: "#0369a1" }}>
                    {user.firstName || user.name || "Customer"}
                  </h6>
                  <div style={{ fontSize: "14px", color: "#0284c7" }}>
                    {user.emailAddresses?.[0]?.emailAddress || user.email}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h5 className="title" style={{ marginBottom: "16px" }}>{t("orderItems")}</h5>
              <div style={{ marginBottom: "32px", border: "1px solid #ddd", borderRadius: "12px", padding: "16px" }}>
                {displayItems.map((item, i) => (
                  <div key={i} className="d-flex align-items-center" style={{ gap: "16px", padding: "12px 0", borderBottom: i < displayItems.length - 1 ? "1px solid #f1f3f5" : "none" }}>
                    <div style={{ width: "80px", height: "80px", borderRadius: "8px", overflow: "hidden", background: "#f8f9fa", flexShrink: 0 }}>
                      <Image src={item.imgSrc || "/images/products/womens/women-1.jpg"} alt={item.title} width={80} height={80} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h6 style={{ marginBottom: "4px", fontSize: "15px" }}>{item.title}</h6>
                      <div style={{ fontSize: "13px", color: "#6c757d", marginBottom: "4px", display: "flex", gap: "8px" }}>
                        {item.selectedColor && <span>{locale === "ar" ? "اللون:" : "Color:"} {item.selectedColor}</span>}
                        {item.selectedSize && <span>{locale === "ar" ? "المقاس:" : "Size:"} {item.selectedSize}</span>}
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: "600" }}>
                        {item.quantity} × ${Number(item.price).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ fontWeight: "700", fontSize: "16px" }}>
                      ${(item.quantity * item.price).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <h5 className="title" style={{ marginBottom: "16px" }}>{t("deliveryInfo")}</h5>
              <div style={{ marginBottom: "24px" }}>
                <label style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", display: "block" }}>
                  {t("orderPhone")} <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); if(errors.phone) setErrors(p => ({...p, phone: false}))}}
                  placeholder="+966..."
                  style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: `1px solid ${errors.phone ? "#dc2626" : "#ddd"}`, fontSize: "15px", outline: "none", fontFamily: "inherit" }}
                />
                {errors.phone && <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", display: "block" }}>{t("orderPhone")}</span>}
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", display: "block" }}>
                  {t("deliveryLocation")} <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <textarea
                  value={location}
                  onChange={(e) => { setLocation(e.target.value); if(errors.location) setErrors(p => ({...p, location: false}))}}
                  placeholder="المدينة، الحي، الشارع..."
                  style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: `1px solid ${errors.location ? "#dc2626" : "#ddd"}`, minHeight: "80px", resize: "vertical", fontFamily: "inherit" }}
                />
                {errors.location && <span style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px", display: "block" }}>{t("deliveryLocation")}</span>}
              </div>

              <div style={{ marginBottom: "32px" }}>
                <label style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", display: "block" }}>
                  {t("orderNotes")}
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("orderNotesPlaceholder")}
                  style={{ width: "100%", padding: "12px 16px", borderRadius: "8px", border: "1px solid #ddd", minHeight: "80px", resize: "vertical", fontFamily: "inherit" }}
                />
              </div>

              <div style={{ background: "#f8f9fa", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
                <div className="d-flex justify-content-between align-items-center text-button" style={{ marginBottom: "10px" }}>
                  <span>{tShop("subtotal")}</span>
                  <span>${displayTotal.toFixed(2)}</span>
                </div>
                <div className="text-button" style={{ marginBottom: "10px" }}>
                  <span style={{ display: "block", marginBottom: "10px" }}>
                    {tShop("paymentMethod")}
                  </span>

                  {[
                    {
                      value: "COD",
                      icon: "💵",
                      label: tShop("cashOnDelivery"),
                      desc: t("cashOnDeliveryDesc"),
                    },
                    {
                      value: "WAYLE",
                      icon: "💳",
                      label: t("onlinePayment"),
                      desc: t("onlinePaymentDesc"),
                    },
                  ].map((option) => (
                    <label
                      key={option.value}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "12px",
                        marginBottom: "8px",
                        border: `1px solid ${paymentMethod === option.value ? "#28a745" : "#ddd"}`,
                        borderRadius: "8px",
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={option.value}
                        checked={paymentMethod === option.value}
                        onChange={() => setPaymentMethod(option.value)}
                        style={{ accentColor: "#28a745", cursor: "pointer" }}
                      />
                      <span aria-hidden="true">{option.icon}</span>
                      <span style={{ flex: 1 }}>
                        <span style={{ display: "block", fontWeight: 600 }}>
                          {option.label}
                        </span>
                        <span style={{ display: "block", fontSize: "12px", opacity: 0.7 }}>
                          {option.desc}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                <hr style={{ margin: "12px 0", borderColor: "#ddd" }} />
                <div className="d-flex justify-content-between align-items-center">
                  <h5>{tShop("total")}</h5>
                  <h5>${displayTotal.toFixed(2)}</h5>
                </div>
              </div>

              {displayItems.length > 0 ? (
                <button
                  className="tf-btn btn-reset"
                  style={{ width: "100%", opacity: isSubmitting ? 0.6 : 1 }}
                  onClick={handlePlaceOrder}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t("placingOrder") : t("confirmOrder")}
                </button>
              ) : (
                <div className="text-center">
                  <p style={{ marginBottom: "16px" }}>{t("cartEmpty")}</p>
                  <Link href={`/${locale}/shop-default-grid`} className="tf-btn btn-reset">
                    {t("goToShop")}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Checkout() {
  return (
    <Suspense fallback={<div className="container text-center py-5">Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
