"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { formatMoney } from "@/lib/currency";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Trash2, Package, User, MapPin, Phone } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function CreateOrderPage() {
  // Shared formatter so staff see the same figures as the storefront.
  const formatCurrency = (a) => formatMoney(a, "USD");
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale || "ar";
  const t = useTranslations("Dashboard");
  const queryClient = useQueryClient();

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [orderItems, setOrderItems] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.toLowerCase();
    return (
      !q ||
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    );
  });

  const filteredProducts = products.filter((p) => {
    const q = productSearch.toLowerCase();
    return (
      !q ||
      p.titleAr?.toLowerCase().includes(q) ||
      p.titleEn?.toLowerCase().includes(q)
    );
  });

  const handleCustomerSelect = (customerId) => {
    setSelectedCustomerId(customerId);
    const customer = customers.find((c) => c.id === customerId);
    if (customer?.phone) setPhone(customer.phone);
    if (errors.customer) setErrors((prev) => ({ ...prev, customer: false }));
  };

  const handleAddProduct = (product) => {
    const existing = orderItems.find((item) => item.productId === product.id);
    if (existing) return; // already added
    setOrderItems((prev) => [
      ...prev,
      {
        productId: product.id,
        titleAr: product.titleAr,
        titleEn: product.titleEn,
        price: product.salePrice || product.price,
        quantity: 1,
        size: product.sizes?.[0] || "",
        color: product.colors?.[0] || "",
        sizes: product.sizes || [],
        colors: product.colors || [],
        image: product.images?.[0] || "",
      },
    ]);
    if (errors.items) setErrors((prev) => ({ ...prev, items: false }));
  };

  const updateItem = (index, field, value) => {
    setOrderItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (index) => {
    setOrderItems((prev) => prev.filter((_, i) => i !== index));
  };

  const total = orderItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handleSubmit = async () => {
    const newErrors = {};
    if (!selectedCustomerId) newErrors.customer = true;
    if (!phone.trim()) newErrors.phone = true;
    if (!location.trim()) newErrors.location = true;
    if (orderItems.length === 0) newErrors.items = true;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedCustomerId,
          phone: phone.trim(),
          location: location.trim(),
          notes: notes || undefined,
          items: orderItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            size: item.size || undefined,
            color: item.color || undefined,
          })),
        }),
      });

      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["orders"] });
        router.push(`/${locale}/dashboard/orders`);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create order");
      }
    } catch (error) {
      console.error("Failed to create order:", error);
      alert("حدث خطأ في الاتصال");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingCustomers || loadingProducts) {
    return (
      <DashboardShell title={t("createOrder")}>
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-60 rounded-xl" />
        </div>
      </DashboardShell>
    );
  }

  const inputStyle = (hasError) => ({
    width: "100%",
    padding: "0.625rem 0.875rem",
    borderRadius: "0.5rem",
    border: `1px solid ${hasError ? "#dc2626" : "#e2e8f0"}`,
    fontSize: "0.875rem",
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color 0.2s",
  });

  return (
    <DashboardShell
      title={t("createOrder")}
      action={
        <button
          onClick={() => router.push(`/${locale}/dashboard/orders`)}
          style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1.25rem", backgroundColor: "#fff", border: "1px solid #e9ecef", borderRadius: "9999px", fontSize: "0.875rem", fontWeight: 700, color: "#1a1a2e", cursor: "pointer" }}
        >
          <ArrowLeft style={{ width: "1rem", height: "1rem" }} />
          {t("back")}
        </button>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Customer + Products */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection */}
          <div style={{ borderRadius: "1rem", border: "1px solid #e9ecef", backgroundColor: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", overflow: "hidden" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f3f5", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <User style={{ color: "#6c757d", width: "1.25rem", height: "1.25rem" }} />
              <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1a1a2e", margin: 0 }}>{t("selectCustomer")} <span style={{ color: "#dc2626" }}>*</span></h2>
            </div>
            <div style={{ padding: "1rem 1.5rem" }}>
              <input
                type="text"
                placeholder="ابحث باسم العميل أو رقم الهاتف..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                style={inputStyle(errors.customer)}
              />
              <div style={{ maxHeight: "200px", overflowY: "auto", marginTop: "0.75rem", borderRadius: "0.5rem", border: "1px solid #f1f3f5" }}>
                {filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleCustomerSelect(c.id)}
                    style={{
                      padding: "0.75rem 1rem",
                      cursor: "pointer",
                      backgroundColor: selectedCustomerId === c.id ? "#eff6ff" : "#fff",
                      borderBottom: "1px solid #f8f9fa",
                      borderLeft: selectedCustomerId === c.id ? "3px solid #2563eb" : "3px solid transparent",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#1a1a2e" }}>{c.name || c.email}</div>
                    <div style={{ fontSize: "0.75rem", color: "#6c757d" }}>{c.email} {c.phone ? `· ${c.phone}` : ""}</div>
                  </div>
                ))}
                {filteredCustomers.length === 0 && (
                  <div style={{ padding: "1rem", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>{t("noResults")}</div>
                )}
              </div>
              {errors.customer && <span style={{ color: "#dc2626", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>{t("selectCustomer")}</span>}
            </div>
          </div>

          {/* Products Selection */}
          <div style={{ borderRadius: "1rem", border: "1px solid #e9ecef", backgroundColor: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", overflow: "hidden" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f3f5", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Package style={{ color: "#6c757d", width: "1.25rem", height: "1.25rem" }} />
              <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1a1a2e", margin: 0 }}>{t("selectProducts")} <span style={{ color: "#dc2626" }}>*</span></h2>
            </div>
            <div style={{ padding: "1rem 1.5rem" }}>
              <input
                type="text"
                placeholder="ابحث عن المنتج..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                style={inputStyle(errors.items)}
              />
              <div style={{ maxHeight: "200px", overflowY: "auto", marginTop: "0.75rem", borderRadius: "0.5rem", border: "1px solid #f1f3f5" }}>
                {filteredProducts.filter(p => p.isActive && p.stock > 0).map((p) => {
                  const alreadyAdded = orderItems.some((item) => item.productId === p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => !alreadyAdded && handleAddProduct(p)}
                      style={{
                        padding: "0.75rem 1rem",
                        cursor: alreadyAdded ? "default" : "pointer",
                        backgroundColor: alreadyAdded ? "#f0fdf4" : "#fff",
                        borderBottom: "1px solid #f8f9fa",
                        opacity: alreadyAdded ? 0.6 : 1,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#1a1a2e" }}>{p.titleAr}</div>
                        <div style={{ fontSize: "0.75rem", color: "#6c757d" }}>
                          {formatCurrency(p.salePrice || p.price)} · {t("stock")}: {p.stock}
                        </div>
                      </div>
                      {!alreadyAdded && <Plus style={{ color: "#2563eb", width: "1.25rem", height: "1.25rem" }} />}
                      {alreadyAdded && <span style={{ fontSize: "0.7rem", color: "#059669", fontWeight: 700 }}>✓ مضاف</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Items */}
            {orderItems.length > 0 && (
              <div style={{ padding: "0 1.5rem 1.5rem" }}>
                <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#1a1a2e", marginBottom: "0.75rem" }}>{t("orderItems")} ({orderItems.length})</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {orderItems.map((item, index) => (
                    <div key={item.productId} style={{ padding: "1rem", borderRadius: "0.75rem", border: "1px solid #e9ecef", backgroundColor: "#fafafa" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "#1a1a2e" }}>{item.titleAr}</span>
                        <button onClick={() => removeItem(index)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", padding: "4px" }}>
                          <Trash2 style={{ width: "1rem", height: "1rem" }} />
                        </button>
                      </div>
                      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                        <div style={{ flex: "1", minWidth: "80px" }}>
                          <label style={{ fontSize: "0.7rem", color: "#6c757d", fontWeight: 600, display: "block", marginBottom: "4px" }}>{t("quantity")}</label>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                            style={{ ...inputStyle(false), maxWidth: "80px" }}
                          />
                        </div>
                        {item.sizes.length > 0 && (
                          <div style={{ flex: "1", minWidth: "80px" }}>
                            <label style={{ fontSize: "0.7rem", color: "#6c757d", fontWeight: 600, display: "block", marginBottom: "4px" }}>{t("size")}</label>
                            <select value={item.size} onChange={(e) => updateItem(index, "size", e.target.value)} style={inputStyle(false)}>
                              {item.sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        )}
                        {item.colors.length > 0 && (
                          <div style={{ flex: "1", minWidth: "80px" }}>
                            <label style={{ fontSize: "0.7rem", color: "#6c757d", fontWeight: 600, display: "block", marginBottom: "4px" }}>{t("color")}</label>
                            <select value={item.color} onChange={(e) => updateItem(index, "color", e.target.value)} style={inputStyle(false)}>
                              {item.colors.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "flex-end" }}>
                          <span style={{ fontWeight: 700, fontSize: "0.875rem", color: "#2563eb" }}>{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column — Contact + Summary */}
        <div className="space-y-6">
          {/* Contact Info */}
          <div style={{ borderRadius: "1rem", border: "1px solid #e9ecef", backgroundColor: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", overflow: "hidden" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f3f5", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Phone style={{ color: "#6c757d", width: "1.25rem", height: "1.25rem" }} />
              <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1a1a2e", margin: 0 }}>{t("customerInfo")}</h2>
            </div>
            <div style={{ padding: "1rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>{t("orderPhone")} <span style={{ color: "#dc2626" }}>*</span></label>
                <input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); if (errors.phone) setErrors((p) => ({ ...p, phone: false })); }}
                  placeholder="+964 7XX XXX XXXX"
                  style={inputStyle(errors.phone)}
                />
                {errors.phone && <span style={{ color: "#dc2626", fontSize: "0.75rem" }}>{t("orderPhone")}</span>}
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>{t("deliveryLocation")} <span style={{ color: "#dc2626" }}>*</span></label>
                <textarea
                  rows={3}
                  value={location}
                  onChange={(e) => { setLocation(e.target.value); if (errors.location) setErrors((p) => ({ ...p, location: false })); }}
                  placeholder="المدينة، الحي، الشارع..."
                  style={inputStyle(errors.location)}
                />
                {errors.location && <span style={{ color: "#dc2626", fontSize: "0.75rem" }}>{t("deliveryLocation")}</span>}
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>{t("notes")}</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("enterNote")}
                  style={inputStyle(false)}
                />
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div style={{ borderRadius: "1rem", border: "1px solid #e9ecef", backgroundColor: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", overflow: "hidden" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f3f5" }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#1a1a2e", margin: 0 }}>{t("orderSummary")}</h2>
            </div>
            <div style={{ padding: "1rem 1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <span style={{ color: "#6c757d", fontSize: "0.875rem" }}>{t("items")}</span>
                <span style={{ fontWeight: 700, fontSize: "0.875rem" }}>{orderItems.length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderTop: "1px solid #f1f3f5" }}>
                <span style={{ fontWeight: 700, fontSize: "1rem", color: "#1a1a2e" }}>{t("total")}</span>
                <span style={{ fontWeight: 700, fontSize: "1.25rem", color: "#2563eb" }}>{formatCurrency(total)}</span>
              </div>
            </div>
            <div style={{ padding: "0 1.5rem 1.5rem" }}>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl font-bold text-base gap-2"
              >
                {isSubmitting ? t("saving") : t("createOrder")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
