"use client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import { useContextElement } from "@/context/Context";
import CurrencyFormatter from "@/components/common/CurrencyFormatter";
import { resolveColor } from "@/lib/products/colors";
import { buildSizeOptions } from "@/lib/products/sizes";
import {
  parseStoredSelections,
  selectionStorageKey,
} from "@/lib/products/selection";
import ProductInfoAccordion from "@/components/productDetails/ProductInfoAccordion";
import ProductTrustBadges from "@/components/productDetails/ProductTrustBadges";
import { useCarousel } from "@/lib/hooks/useCarousel";

/**
 * Product detail.
 *
 * The shopper builds a basket of (colour, size, quantity) rows for this one
 * product before committing, so buying two sizes of the same colour — or the
 * same size in two colours — is one trip through the page instead of several.
 *
 * IMPORTANT, and the reason the quantities are capped the way they are:
 * `Product.stock` is a single Int covering EVERY size and colour
 * (prisma/schema.prisma:84). There is no per-variant inventory in the schema.
 * So the cap has to apply to the SUM of every selected row, not to each row —
 * otherwise a product with one unit left would happily accept "size 38 x1 and
 * size 39 x1" and the order would be rejected at checkout after the shopper had
 * entered their details.
 */
export default function DynamicDetails({ product, locale = "ar", trustBadges = [] }) {
  const ar = locale === "ar";

  const [activeColor, setActiveColor] = useState(product.colors?.[0] || "");
  const [notice, setNotice] = useState("");

  /**
   * Gallery carousel.
   *
   * Every image stays in the document, so crawlers still see the whole set.
   *
   * It wraps: swiping past the last image continues into the first. useCarousel
   * explains how — in short, there are no duplicated slides, each photo is just
   * drawn at whichever copy of itself is nearest, so there is no wrap to detect
   * and nothing to correct after the fact.
   */
  const gallery = product.images ?? [];
  // A single photo has nothing to move between; two would show the same picture
  // on both sides of the loop.
  const loopGallery = gallery.length >= 3;
  const {
    index: activeIndex,
    attachViewport: attachGallery,
    registerSlide,
    dragHandlers,
    goTo: goToSlide,
  } = useCarousel(gallery.length, { loop: loopGallery });

  const { addVariantsToCart } = useContextElement();

  const title = ar ? product.titleAr : product.titleEn;
  const hasDiscount = product.salePrice && product.salePrice < product.price;
  const unitPrice = product.salePrice || product.price;
  const stock = Number(product.stock) || 0;
  const inStock = stock > 0;

  const sizeOptions = useMemo(
    () => buildSizeOptions(product.sizes),
    [product.sizes]
  );

  const storageKey = selectionStorageKey(product.slug);

  /**
   * Restore the in-progress selection after a reload, without a hydration
   * mismatch.
   *
   * Reading sessionStorage during render would make the client's first render
   * disagree with the server HTML, which React reports as a hydration error. An
   * effect calling setState would dodge that, but it queues a second render on
   * every visit and trips react-hooks/set-state-in-effect. useSyncExternalStore
   * is the supported way to read a browser-only store: it serves `null` for the
   * server render and during hydration, then swaps to the real value once
   * hydration has committed.
   *
   * getSnapshot returns the RAW string on purpose — React requires it to be
   * referentially stable between calls, and a freshly parsed array never is. The
   * parsing happens in the memo below instead.
   */
  const subscribeToStorage = useCallback((onStoreChange) => {
    window.addEventListener("storage", onStoreChange);
    return () => window.removeEventListener("storage", onStoreChange);
  }, []);

  const readStorage = useCallback(() => {
    try {
      return window.sessionStorage.getItem(storageKey);
    } catch {
      // Private browsing and blocked storage should cost the shopper nothing.
      return null;
    }
  }, [storageKey]);

  const storedRaw = useSyncExternalStore(
    subscribeToStorage,
    readStorage,
    () => null
  );

  const restored = useMemo(
    () =>
      parseStoredSelections(storedRaw, {
        sizes: product.sizes,
        colors: product.colors,
        stock,
      }),
    [storedRaw, product.sizes, product.colors, stock]
  );

  /**
   * `null` until the shopper touches a picker; their edits win from then on.
   * Keeping the two apart is what lets the restored value arrive after hydration
   * without overwriting anything already clicked.
   */
  const [edited, setEdited] = useState(null);
  const selections = edited ?? restored;

  const totalUnits = selections.reduce((sum, row) => sum + row.quantity, 0);
  const remaining = Math.max(0, stock - totalUnits);

  // Write-through. No setState here, so this stays a pure side effect. The
  // `storage` event does not fire in the document that wrote the value, so this
  // cannot feed back into the subscription above.
  useEffect(() => {
    try {
      if (selections.length) {
        window.sessionStorage.setItem(storageKey, JSON.stringify(selections));
      } else {
        window.sessionStorage.removeItem(storageKey);
      }
    } catch {
      /* storage unavailable — the page still works, it just will not remember */
    }
  }, [storageKey, selections]);

  const keyOf = (size, color) => `${size}::${color ?? ""}`;

  const capMessage = ar
    ? `لا يمكن اختيار أكثر من ${stock} قطعة — هذا كل المتوفر.`
    : `You cannot pick more than ${stock} — that is all we have.`;

  // Both handlers decide from the CURRENT `selections` before calling setState,
  // rather than deciding inside the updater. A state updater has to be pure —
  // React may run it more than once — so raising the "out of stock" notice from
  // inside one would fire the message twice and make the guard order-dependent.
  // These run from a click, one at a time, so reading state directly is sound.
  const toggleSize = (size) => {
    const key = keyOf(size, activeColor || null);
    const index = selections.findIndex(
      (row) => keyOf(row.size, row.color) === key
    );

    // Clicking a chosen size again removes it, so the grid doubles as the list
    // of what is currently selected.
    if (index !== -1) {
      setNotice("");
      setEdited(selections.filter((_, i) => i !== index));
      return;
    }

    if (totalUnits >= stock) {
      setNotice(capMessage);
      return;
    }

    setNotice("");
    setEdited([...selections, { size, color: activeColor || null, quantity: 1 }]);
  };

  const changeQuantity = (index, delta) => {
    const row = selections[index];
    if (!row) return;

    const next = row.quantity + delta;

    // Stepping below one removes the row rather than leaving a zero behind.
    if (next < 1) {
      setNotice("");
      setEdited(selections.filter((_, i) => i !== index));
      return;
    }

    if (totalUnits - row.quantity + next > stock) {
      setNotice(capMessage);
      return;
    }

    setNotice("");
    setEdited(
      selections.map((item, i) =>
        i === index ? { ...item, quantity: next } : item
      )
    );
  };

  const removeSelection = (index) => {
    setNotice("");
    setEdited(selections.filter((_, i) => i !== index));
  };

  /**
   * The cart expects the card-shaped object the listing pages build, not the raw
   * Prisma row: `id` must be the SLUG (cart line keys are built from it, so the
   * detail page and the listing pages have to agree or the same variant becomes
   * two lines), and `dbId` must be the real database id or the provider rejects
   * the item outright and checkout never sees it.
   */
  const cartSource = useMemo(
    () => ({
      id: product.slug,
      dbId: product.id,
      title,
      price: unitPrice,
      oldPrice: hasDiscount ? product.price : null,
      imgSrc: product.images?.[0] || "",
      imgHover: product.images?.[1] || product.images?.[0] || "",
      isOnSale: Boolean(hasDiscount),
      sizes: product.sizes,
      filterColor: product.colors,
      inStock,
    }),
    [product, title, unitPrice, hasDiscount, inStock]
  );

  const requireSelection = () => {
    if (selections.length === 0) {
      setNotice(
        ar
          ? "اختر مقاسًا واحدًا على الأقل قبل المتابعة."
          : "Pick at least one size before continuing."
      );
      return false;
    }
    return true;
  };

  const handleAddToCart = () => {
    if (!inStock || !requireSelection()) return;
    // isModal opens the cart drawer, which is where continue-shopping and the
    // route to checkout both live.
    addVariantsToCart(cartSource, selections, { isModal: true });
    // Clearing also wipes the saved selection, via the write-through effect —
    // the picks now live in the cart and should not come back on reload.
    setEdited([]);
  };

  const selectedKeys = new Set(
    selections.map((row) => keyOf(row.size, row.color))
  );

  return (
    <section className="flat-spacing">
      <div className="container">
        <div className="row">
          {/* Images — a swipeable full-bleed carousel with dots.
              Native scroll-snap rather than a carousel library: it gives real
              touch swiping, keyboard scrolling and momentum for free, keeps the
              images in the document for the crawler, and adds no javascript to
              the bundle. The dots are the only state. */}
          <div className="col-md-6 mb-4 mb-md-0">
            <div style={{ position: "sticky", top: "100px" }}>
              {gallery.length > 0 ? (
                <>
                  <div
                    ref={attachGallery}
                    className="pdp-gallery"
                    {...dragHandlers}
                  >
                    {gallery.map((img, i) => (
                      <div
                        className="pdp-gallery__slide"
                        key={img + i}
                        ref={registerSlide(i)}
                      >
                        <Image
                          src={img}
                          alt={`${title} — ${i + 1}`}
                          width={900}
                          height={1200}
                          // No clones any more, so the first real slide — the
                          // LCP candidate — is simply the first one.
                          priority={i === 0}
                          sizes="(max-width: 767px) 100vw, 50vw"
                          // A drag that starts on a photo must move the
                          // carousel, not tear the image out of the page.
                          draggable={false}
                          className="pdp-gallery__img"
                        />
                      </div>
                    ))}
                  </div>

                  {gallery.length > 1 && (
                    <div className="pdp-dots" role="tablist" aria-label={title}>
                      {gallery.map((img, i) => (
                        <button
                          key={img + i}
                          type="button"
                          role="tab"
                          aria-selected={i === activeIndex}
                          aria-label={`${i + 1} / ${gallery.length}`}
                          onClick={() => goToSlide(i)}
                          className={`pdp-dot${
                            i === activeIndex ? " is-active" : ""
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div
                  style={{ width: "100%", paddingBottom: "133%", background: "#f8f9fa" }}
                />
              )}
            </div>
          </div>

          {/* Details */}
          <div className="col-md-6">
            <div style={{ padding: "0 15px" }}>
              {product.category && (
                <div
                  style={{
                    fontSize: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    color: "#6c757d",
                    marginBottom: "8px",
                    fontWeight: "600",
                  }}
                >
                  {ar ? product.category.nameAr : product.category.nameEn}
                </div>
              )}

              <h1
                style={{
                  fontSize: "28px",
                  fontWeight: "700",
                  color: "#1a1a2e",
                  marginBottom: "16px",
                }}
              >
                {title}
              </h1>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "24px",
                }}
              >
                <span
                  style={{
                    fontSize: "24px",
                    fontWeight: "700",
                    // Always the text colour, discounted or not. The red was
                    // doing the same job as the struck-through original beside
                    // it and the SALE badge — three signals for one fact, and it
                    // made the price the shopper actually pays read as a
                    // warning.
                    color: "#1a1a2e",
                  }}
                >
                  <CurrencyFormatter price={unitPrice} />
                </span>
                {hasDiscount && (
                  <>
                    <span
                      style={{
                        fontSize: "18px",
                        color: "#6c757d",
                        textDecoration: "line-through",
                      }}
                    >
                      <CurrencyFormatter price={product.price} />
                    </span>
                    <span
                      style={{
                        // Brand accent. Dark text, not white: the accent is a
                        // light pink and white on it is a 1.9:1 contrast.
                        background: "var(--brand-accent)",
                        color: "var(--brand-accent-on)",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      SALE
                    </span>
                  </>
                )}
              </div>

              {/* The description now lives in the accordion below the buy
                  button, with the size guide and delivery, instead of pushing
                  the pickers down the page. */}
              <hr style={{ borderColor: "#f1f3f5", margin: "24px 0" }} />

              {/* Colour — picks the colour that the next size click attaches to */}
              {product.colors?.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      marginBottom: "12px",
                      color: "#1a1a2e",
                    }}
                  >
                    {ar ? "اللون:" : "Color:"}{" "}
                    <span style={{ color: "#6c757d", fontWeight: "normal" }}>
                      {activeColor}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {product.colors.map((color) => {
                      // The name alone left the shopper guessing what "بيج" or
                      // "وردي داكن" actually looks like; the dot answers that.
                      const swatch = resolveColor(color);
                      const isActive = activeColor === color;
                      // How many units of this colour are already chosen, so the
                      // shopper can see their basket while switching colours.
                      const chosen = selections
                        .filter((row) => row.color === color)
                        .reduce((sum, row) => sum + row.quantity, 0);
                      return (
                        <button
                          key={color}
                          onClick={() => {
                            setActiveColor(color);
                            setNotice("");
                          }}
                          aria-pressed={isActive}
                          aria-label={color}
                          title={color}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "10px",
                            border: isActive
                              ? "2px solid #111"
                              : "1px solid #ced4da",
                            // Square, matching the card swatches and the
                            // rest of the squared-off product surfaces.
                            borderRadius: 0,
                            background: isActive ? "#f8f9fa" : "#fff",
                            color: "#111",
                            fontSize: "14px",
                            fontWeight: isActive ? "600" : "400",
                            cursor: "pointer",
                            // Named properties rather than `all`: `all` makes the
                            // browser watch every animatable property on the
                            // element, including ones that force layout.
                            transition:
                              "border-color 160ms ease, background-color 160ms ease",
                          }}
                        >
                          <span
                            aria-hidden="true"
                            style={{
                              width: "16px",
                              height: "16px",
                              borderRadius: 0,
                              backgroundColor: swatch.hex,
                              // Pale swatches need their own outline or they
                              // vanish against the white pill.
                              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.18)",
                              flexShrink: 0,
                            }}
                          />
                          {/* The name is deliberately not printed here — the
                              "Color: <name>" line above already says which one
                              is selected, and repeating it in every pill made
                              the row three times wider than the swatches need.
                              aria-label and title carry it instead, so the
                              button still has an accessible name and the colour
                              is identifiable on hover. */}
                          {chosen > 0 && (
                            <span
                              style={{
                                background: "#111",
                                color: "#fff",
                                borderRadius: "999px",
                                fontSize: "11px",
                                fontWeight: 700,
                                minWidth: "18px",
                                height: "18px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "0 5px",
                              }}
                            >
                              {chosen}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sizes — the whole run, with the ones we do not carry struck out */}
              <div style={{ marginBottom: "24px" }}>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "600",
                    marginBottom: "12px",
                    color: "#1a1a2e",
                  }}
                >
                  {ar ? "المقاس:" : "Size:"}{" "}
                  <span style={{ color: "#6c757d", fontWeight: "normal" }}>
                    {ar
                      ? "اختر مقاسًا أو أكثر"
                      : "pick one or more"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {sizeOptions.map(({ size, available }) => {
                    const isSelected = selectedKeys.has(
                      keyOf(size, activeColor || null)
                    );
                    return (
                      <button
                        key={size}
                        onClick={() => available && toggleSize(size)}
                        disabled={!available || !inStock}
                        aria-pressed={isSelected}
                        title={
                          available
                            ? undefined
                            : ar
                            ? "غير متوفر"
                            : "Not available"
                        }
                        style={{
                          position: "relative",
                          minWidth: "48px",
                          height: "48px",
                          padding: "0 12px",
                          border: isSelected
                            ? "2px solid #111"
                            : "1px solid #ced4da",
                          borderRadius: "8px",
                          background: isSelected
                            ? "#111"
                            : available
                            ? "#fff"
                            : "#f8f9fa",
                          color: isSelected
                            ? "#fff"
                            : available
                            ? "#1a1a2e"
                            : "#adb5bd",
                          fontSize: "14px",
                          fontWeight: "600",
                          cursor: available && inStock ? "pointer" : "not-allowed",
                          // A struck-through label reads as "we do not have this"
                          // rather than "this button is broken".
                          textDecoration: available ? "none" : "line-through",
                          transition:
                            "border-color 160ms ease, background-color 160ms ease, color 160ms ease",
                        }}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* What the shopper has chosen so far */}
              {selections.length > 0 && (
                <div
                  style={{
                    marginBottom: "20px",
                    border: "1px solid #e9ecef",
                    borderRadius: "12px",
                    overflow: "hidden",
                  }}
                >
                  {selections.map((row, index) => (
                    <div
                      key={keyOf(row.size, row.color)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px 14px",
                        borderBottom:
                          index === selections.length - 1
                            ? "none"
                            : "1px solid #f1f3f5",
                      }}
                    >
                      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
                        <div style={{ fontSize: "14px", fontWeight: 600 }}>
                          {ar ? "المقاس" : "Size"} {row.size}
                          {row.color ? ` · ${row.color}` : ""}
                        </div>
                        <div style={{ fontSize: "12px", color: "#6c757d" }}>
                          <CurrencyFormatter price={unitPrice * row.quantity} />
                        </div>
                      </div>

                      <div
                        style={{
                          display: "inline-flex",
                          border: "1px solid #ced4da",
                          borderRadius: "8px",
                          overflow: "hidden",
                          height: "36px",
                          flexShrink: 0,
                        }}
                      >
                        <button
                          onClick={() => changeQuantity(index, -1)}
                          aria-label={ar ? "إنقاص" : "Decrease"}
                          style={{
                            width: "36px",
                            background: "#f8f9fa",
                            border: "none",
                            fontSize: "16px",
                            cursor: "pointer",
                            color: "#495057",
                          }}
                        >
                          -
                        </button>
                        <span
                          style={{
                            width: "44px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderLeft: "1px solid #ced4da",
                            borderRight: "1px solid #ced4da",
                            fontWeight: 600,
                            fontSize: "14px",
                          }}
                        >
                          {row.quantity}
                        </span>
                        <button
                          onClick={() => changeQuantity(index, 1)}
                          aria-label={ar ? "زيادة" : "Increase"}
                          disabled={remaining <= 0}
                          style={{
                            width: "36px",
                            background: "#f8f9fa",
                            border: "none",
                            fontSize: "16px",
                            cursor: remaining > 0 ? "pointer" : "not-allowed",
                            color: remaining > 0 ? "#495057" : "#ced4da",
                          }}
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeSelection(index)}
                        style={{
                          flexShrink: 0,
                          border: "none",
                          background: "none",
                          color: "#adb5bd",
                          fontSize: "12px",
                          textDecoration: "underline",
                          cursor: "pointer",
                        }}
                      >
                        {ar ? "إزالة" : "Remove"}
                      </button>
                    </div>
                  ))}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      background: "#f8f9fa",
                      fontSize: "14px",
                      fontWeight: 700,
                    }}
                  >
                    <span>
                      {ar
                        ? `${totalUnits} قطعة`
                        : `${totalUnits} item${totalUnits === 1 ? "" : "s"}`}
                    </span>
                    <CurrencyFormatter price={unitPrice * totalUnits} />
                  </div>
                </div>
              )}

              {/* Stock, and how much of it is still selectable */}
              <div style={{ marginBottom: "16px" }}>
                <span
                  style={{
                    fontSize: "13px",
                    color: inStock ? "#059669" : "#dc2626",
                    fontWeight: "600",
                  }}
                >
                  {inStock
                    ? ar
                      ? `${stock} متوفر في المخزون`
                      : `${stock} in stock`
                    : ar
                    ? "نفدت الكمية"
                    : "Out of stock"}
                </span>
                {inStock && totalUnits > 0 && (
                  <span
                    style={{
                      marginInlineStart: "12px",
                      fontSize: "13px",
                      color: "#6c757d",
                    }}
                  >
                    {ar
                      ? `يمكنك إضافة ${remaining} أخرى`
                      : `${remaining} more available`}
                  </span>
                )}
              </div>

              {notice && (
                <div
                  role="status"
                  style={{
                    marginBottom: "16px",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    background: "#fff4f4",
                    border: "1px solid #f5c2c2",
                    color: "#b42318",
                    fontSize: "13px",
                  }}
                >
                  {notice}
                </div>
              )}

              {/* Add to cart is the only action now. Buy It Now was removed: it
                  bypassed the cart, and with several variants selectable there
                  is no longer a single thing for it to buy — it had to add the
                  rows to the cart first anyway, which is what this does.

                  Hidden below md: the sticky bar at the foot of the screen
                  already carries this button on phones, and two of them meant
                  the shopper scrolled past one to reach an identical one. */}
              <div className="d-none d-md-block" style={{ marginBottom: "16px" }}>
                <button
                  onClick={handleAddToCart}
                  disabled={!inStock}
                  style={{
                    width: "100%",
                    backgroundColor: inStock
                      ? "var(--brand-accent)"
                      : "#ced4da",
                    color: inStock ? "var(--brand-accent-on)" : "#fff",
                    border: "none",
                    padding: "18px 24px",
                    fontSize: "14px",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    fontWeight: "700",
                    borderRadius: "8px",
                    cursor: inStock ? "pointer" : "not-allowed",
                    transition: "background-color 0.3s ease",
                  }}
                  onMouseOver={(e) => {
                    if (inStock)
                      e.currentTarget.style.backgroundColor =
                        "var(--brand-accent-hover)";
                  }}
                  onMouseOut={(e) => {
                    if (inStock)
                      e.currentTarget.style.backgroundColor =
                        "var(--brand-accent)";
                  }}
                >
                  {ar ? "أضف إلى السلة" : "Add to cart"}
                </button>
              </div>

              <ProductTrustBadges badges={trustBadges} locale={locale} />

              <ProductInfoAccordion product={product} locale={locale} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky bar */}
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
          alignItems: "center",
        }}
      >
        <div
          style={{
            flexShrink: 0,
            fontWeight: "700",
            fontSize: "18px",
            color: "#1a1a2e",
          }}
        >
          <CurrencyFormatter
            price={totalUnits > 0 ? unitPrice * totalUnits : unitPrice}
          />
        </div>
        <button
          onClick={handleAddToCart}
          disabled={!inStock}
          style={{
            flex: 1,
            backgroundColor: inStock ? "var(--brand-accent)" : "#ced4da",
            color: inStock ? "var(--brand-accent-on)" : "#fff",
            border: "none",
            padding: "14px 20px",
            fontSize: "14px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            fontWeight: "700",
            borderRadius: "8px",
            cursor: inStock ? "pointer" : "not-allowed",
            transition: "background-color 0.3s ease",
          }}
        >
          {ar ? "أضف إلى السلة" : "Add to cart"}
        </button>
      </div>
    </section>
  );
}
