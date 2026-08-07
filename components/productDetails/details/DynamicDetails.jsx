"use client";
import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useContextElement } from "@/context/Context";
import CurrencyFormatter from "@/components/common/CurrencyFormatter";

export default function DynamicDetails({ product, locale = "ar" }) {
  const router = useRouter();
  const [activeImage, setActiveImage] = useState(product.images?.[0] || "");
  const [quantity, setQuantity] = useState(1);
  const [activeSize, setActiveSize] = useState(product.sizes?.[0] || "");
  const [activeColor, setActiveColor] = useState(product.colors?.[0] || "");

  const { addProductToCart } = useContextElement();

  const title = locale === "ar" ? product.titleAr : product.titleEn;
  const desc = locale === "ar" ? product.descAr : product.descEn;
  const hasDiscount = product.salePrice && product.salePrice < product.price;

  const handleBuyNow = () => {
    // Redirect to simple checkout page with query params
    const params = new URLSearchParams({
      product: product.slug,
      qty: quantity.toString(),
      size: activeSize,
      color: activeColor,
    });
    router.push(`/${locale}/checkout?${params.toString()}`);
  };

  const handleAddToCart = () => {
    // Adding DB product shape mapped to Context expectation
    const cartItem = {
      id: product.id,
      title: title,
      price: product.salePrice || product.price,
      oldPrice: hasDiscount ? product.price : null,
      imgSrc: product.images?.[0],
      quantity: quantity,
      size: activeSize,
      color: activeColor,
    };
    // The cart logic expects `addProductToCart(id, qty)` to find item in allProducts, 
    // but since we bypass it, we might need to modify cart context later. 
    // For now we just push.
    // Wait, addProductToCart pulls from allProducts by ID. 
    // Since we're doing simple checkout for "Buy It Now", that's the priority.
    handleBuyNow(); 
  };

  return (
    <section className="flat-spacing">
      <div className="container">
        <div className="row">
          {/* Images Section */}
          <div className="col-md-6 mb-4 mb-md-0">
            <div style={{ position: "sticky", top: "100px" }}>
              <div style={{ borderRadius: "16px", overflow: "hidden", marginBottom: "16px", border: "1px solid #f1f3f5" }}>
                {activeImage ? (
                  <Image
                    src={activeImage}
                    alt={title}
                    width={800}
                    height={800}
                    style={{ width: "100%", height: "auto", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ width: "100%", paddingBottom: "100%", backgroundColor: "#f8f9fa" }}></div>
                )}
              </div>
              {product.images?.length > 1 && (
                <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "10px" }}>
                  {product.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(img)}
                      style={{
                        width: "80px",
                        height: "80px",
                        flexShrink: 0,
                        border: activeImage === img ? "2px solid #111" : "1px solid #e9ecef",
                        borderRadius: "8px",
                        overflow: "hidden",
                        padding: 0,
                        background: "none",
                        cursor: "pointer"
                      }}
                    >
                      <Image
                        src={img}
                        alt={`${title} - ${i + 1}`}
                        width={80}
                        height={80}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Details Section */}
          <div className="col-md-6">
            <div style={{ padding: "0 15px" }}>
              {product.category && (
                <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", color: "#6c757d", marginBottom: "8px", fontWeight: "600" }}>
                  {locale === "ar" ? product.category.nameAr : product.category.nameEn}
                </div>
              )}
              
              <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#1a1a2e", marginBottom: "16px" }}>
                {title}
              </h1>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                <span style={{ fontSize: "24px", fontWeight: "700", color: hasDiscount ? "#dc2626" : "#1a1a2e" }}>
                  ${(product.salePrice || product.price).toFixed(2)}
                </span>
                {hasDiscount && (
                  <span style={{ fontSize: "18px", color: "#6c757d", textDecoration: "line-through" }}>
                    <CurrencyFormatter price={product.price} />
                  </span>
                )}
                {hasDiscount && (
                  <span style={{ background: "#dc2626", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "600" }}>
                    SALE
                  </span>
                )}
              </div>

              {desc && (
                <p style={{ color: "#495057", lineHeight: "1.6", marginBottom: "32px", fontSize: "15px" }}>
                  {desc}
                </p>
              )}

              <hr style={{ borderColor: "#f1f3f5", margin: "24px 0" }} />

              {/* Colors */}
              {product.colors?.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#1a1a2e" }}>
                    {locale === "ar" ? "اللون:" : "Color:"} <span style={{ color: "#6c757d", fontWeight: "normal" }}>{activeColor}</span>
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {product.colors.map(color => (
                      <button
                        key={color}
                        onClick={() => setActiveColor(color)}
                        style={{
                          padding: "8px 16px",
                          border: activeColor === color ? "2px solid #111" : "1px solid #ced4da",
                          borderRadius: "40px",
                          background: activeColor === color ? "#f8f9fa" : "#fff",
                          color: "#111",
                          fontSize: "14px",
                          fontWeight: activeColor === color ? "600" : "400",
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sizes */}
              {product.sizes?.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#1a1a2e", display: "flex", justifyContent: "space-between" }}>
                    <span>{locale === "ar" ? "المقاس:" : "Size:"} <span style={{ color: "#6c757d", fontWeight: "normal" }}>{activeSize}</span></span>
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {product.sizes.map(size => (
                      <button
                        key={size}
                        onClick={() => setActiveSize(size)}
                        style={{
                          minWidth: "48px",
                          height: "48px",
                          padding: "0 12px",
                          border: activeSize === size ? "2px solid #111" : "1px solid #ced4da",
                          borderRadius: "8px",
                          background: activeSize === size ? "#111" : "#fff",
                          color: activeSize === size ? "#fff" : "#1a1a2e",
                          fontSize: "14px",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div style={{ marginBottom: "32px" }}>
                <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px", color: "#1a1a2e" }}>
                  {locale === "ar" ? "الكمية:" : "Quantity:"}
                </div>
                <div style={{ display: "inline-flex", border: "1px solid #ced4da", borderRadius: "8px", overflow: "hidden", height: "48px" }}>
                  <button 
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    style={{ width: "48px", background: "#f8f9fa", border: "none", fontSize: "18px", cursor: "pointer", color: "#495057" }}
                  >-</button>
                  <input 
                    type="text" 
                    value={quantity} 
                    readOnly
                    style={{ width: "60px", textAlign: "center", border: "none", borderLeft: "1px solid #ced4da", borderRight: "1px solid #ced4da", fontWeight: "600", fontSize: "15px", color: "#1a1a2e" }}
                  />
                  <button 
                    onClick={() => setQuantity(q => q + 1)}
                    style={{ width: "48px", background: "#f8f9fa", border: "none", fontSize: "18px", cursor: "pointer", color: "#495057" }}
                  >+</button>
                </div>
                <span style={{ marginLeft: "16px", fontSize: "13px", color: product.stock > 0 ? "#059669" : "#dc2626", fontWeight: "600" }}>
                  {product.stock > 0 
                    ? (locale === "ar" ? `${product.stock} متوفر في المخزون` : `${product.stock} in stock`)
                    : (locale === "ar" ? "نفدت الكمية" : "Out of stock")}
                </span>
              </div>

              {/* Buy Now Button */}
              <button
                onClick={handleBuyNow}
                disabled={product.stock <= 0}
                style={{
                  width: "100%",
                  backgroundColor: product.stock > 0 ? "#111" : "#ced4da",
                  color: "#fff",
                  border: "none",
                  padding: "18px 24px",
                  fontSize: "14px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontWeight: "700",
                  borderRadius: "8px",
                  cursor: product.stock > 0 ? "pointer" : "not-allowed",
                  transition: "background-color 0.3s ease",
                  marginBottom: "16px"
                }}
                onMouseOver={(e) => { if(product.stock > 0) e.currentTarget.style.backgroundColor = '#333' }}
                onMouseOut={(e) => { if(product.stock > 0) e.currentTarget.style.backgroundColor = '#111' }}
              >
                {locale === "ar" ? "اشتري الآن" : "Buy It Now"}
              </button>

            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Buy Button */}
      <div 
        className="d-md-none" 
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#fff",
          padding: "16px",
          borderTop: "1px solid #e2e8f0",
          boxShadow: "0 -4px 6px -1px rgba(0, 0, 0, 0.05)",
          zIndex: 50,
          display: "flex",
          gap: "12px",
          alignItems: "center"
        }}
      >
        <div style={{ flexShrink: 0, fontWeight: "700", fontSize: "18px", color: hasDiscount ? "#dc2626" : "#1a1a2e" }}>
          ${(product.salePrice || product.price).toFixed(2)}
        </div>
        <button
          onClick={handleBuyNow}
          disabled={product.stock <= 0}
          style={{
            flex: 1,
            backgroundColor: product.stock > 0 ? "#111" : "#ced4da",
            color: "#fff",
            border: "none",
            padding: "14px 20px",
            fontSize: "14px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            fontWeight: "700",
            borderRadius: "8px",
            cursor: product.stock > 0 ? "pointer" : "not-allowed",
            transition: "background-color 0.3s ease"
          }}
        >
          {locale === "ar" ? "اشتري الآن" : "Buy It Now"}
        </button>
      </div>
    </section>
  );
}
