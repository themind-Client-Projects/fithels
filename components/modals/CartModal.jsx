"use client";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useContextElement } from "@/context/Context";
import { useLocale } from "next-intl";
import CurrencyFormatter from "@/components/common/CurrencyFormatter";
export default function CartModal() {
  const {
    cartProducts,
    setCartProducts,
    totalPrice,
    addProductToCart,
    isAddedToCartProducts,
  } = useContextElement();
  const locale = useLocale();

  // Remove the specific variant line. Filtering by product id alone would drop
  // every size/colour of that product from the cart at once.
  const removeItem = (item) => {
    setCartProducts((pre) =>
      pre.filter((elm) =>
        item.lineKey ? elm.lineKey !== item.lineKey : elm.id != item.id
      )
    );
  };

  const [currentOpenPopup, setCurrentOpenPopup] = useState("");

  // These recommendations used to come from the static template fixture, whose
  // ids exist nowhere in the database. Adding one poisoned the cart and made
  // every later checkout fail, so they are read from the catalogue instead.
  const [recommendations, setRecommendations] = useState([]);
  useEffect(() => {
    let cancelled = false;
    // Ask for six, not the whole catalogue. This drawer mounts in the root
    // layout, so it ran on EVERY storefront page load.
    fetch("/api/products?limit=6")
      .then((res) => (res.ok ? res.json() : []))
      .then((products) => {
        if (cancelled || !Array.isArray(products)) return;
        setRecommendations(
          products.slice(0, 6).map((p) => ({
            id: p.slug,
            dbId: p.id,
            title: locale === "ar" ? p.titleAr : p.titleEn,
            price: p.salePrice ?? p.price,
            imgSrc: p.images?.[0] || "/images/products/womens/women-1.jpg",
          }))
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return (
    <div className="modal fullRight fade modal-shopping-cart" id="shoppingCart">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="tf-minicart-recommendations">
            <h6 className="title">You May Also Like</h6>
            <div className="wrap-recommendations">
              <div className="list-cart">
                {recommendations.map((product) => (
                  <div className="list-cart-item" key={product.dbId}>
                    <div className="image">
                      <Image
                        className="lazyload"
                        data-src={product.imgSrc}
                        alt={product.title}
                        src={product.imgSrc}
                        width={600}
                        height={800}
                      />
                    </div>
                    <div className="content">
                      <div className="name">
                        <Link
                          className="link text-line-clamp-1"
                          href={`/${locale}/product-detail/${product.id}`}
                        >
                          {product.title}
                        </Link>
                      </div>
                      <div className="cart-item-bot">
                        <div className="text-button price">
                          <CurrencyFormatter price={product.price} />
                        </div>
                        <a
                          className="link text-button"
                          onClick={() => addProductToCart(product, 1, false)}
                        >
                          {isAddedToCartProducts(product.id)
                            ? "Already Added"
                            : "Add to cart"}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="d-flex flex-column flex-grow-1 h-100">
            <div className="header">
              <h5 className="title">Shopping Cart</h5>
              <span
                className="icon-close icon-close-popup"
                data-bs-dismiss="modal"
              />
            </div>
            <div className="wrap">
              <div className="tf-mini-cart-threshold">
                <div className="tf-progress-bar">
                  <div
                    className="value"
                    style={{ width: "0%" }}
                    data-progress={75}
                  >
                    <i className="icon icon-shipping" />
                  </div>
                </div>
                <div className="text-caption-1">
                  Congratulations! You've got free shipping!
                </div>
              </div>
              <div className="tf-mini-cart-wrap">
                <div className="tf-mini-cart-main">
                  <div className="tf-mini-cart-sroll">
                    {cartProducts.length ? (
                      <div className="tf-mini-cart-items">
                        {cartProducts.map((product, i) => (
                          <div
                            key={i}
                            className="tf-mini-cart-item file-delete"
                          >
                            <div className="tf-mini-cart-image">
                              <Image
                                className="lazyload"
                                alt=""
                                src={product.imgSrc}
                                width={600}
                                height={800}
                              />
                            </div>
                            <div className="tf-mini-cart-info flex-grow-1">
                              <div className="mb_12 d-flex align-items-center justify-content-between flex-wrap gap-12">
                                <div className="text-title">
                                  <Link
                                    href={`/${locale}/product-detail/${product.id}`}
                                    className="link text-line-clamp-1"
                                  >
                                    {product.title}
                                  </Link>
                                </div>
                                <div
                                  className="text-button tf-btn-remove remove"
                                  onClick={() => removeItem(product)}
                                >
                                  Remove
                                </div>
                              </div>
                              <div className="d-flex align-items-center justify-content-between flex-wrap gap-12">
                                <div className="text-secondary-2">
                                  {[product.selectedSize, product.selectedColor]
                                    .filter(Boolean)
                                    .join(" / ")}
                                </div>
                                <div className="text-button">
                                  {product.quantity} X{" "}
                                  <CurrencyFormatter price={product.price} />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4">
                        Your Cart is empty. Start adding favorite products to
                        cart!{" "}
                        <Link className="btn-line" href={`/${locale}/shop-default-grid`}>
                          Explore Products
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
                <div className="tf-mini-cart-bottom">
                  <div className="tf-mini-cart-tool">
                    <div
                      className="tf-mini-cart-tool-btn btn-add-note"
                      onClick={() => setCurrentOpenPopup("add-note")}
                    >
                      <svg
                        width={21}
                        height={20}
                        viewBox="0 0 21 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <g clipPath="url(#clip0_6133_36620)">
                          <path
                            d="M10 3.33325H4.16667C3.72464 3.33325 3.30072 3.50885 2.98816 3.82141C2.67559 4.13397 2.5 4.55789 2.5 4.99992V16.6666C2.5 17.1086 2.67559 17.5325 2.98816 17.8451C3.30072 18.1577 3.72464 18.3333 4.16667 18.3333H15.8333C16.2754 18.3333 16.6993 18.1577 17.0118 17.8451C17.3244 17.5325 17.5 17.1086 17.5 16.6666V10.8333"
                            stroke="#181818"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M16.25 2.0832C16.5815 1.75168 17.0312 1.56543 17.5 1.56543C17.9688 1.56543 18.4185 1.75168 18.75 2.0832C19.0815 2.41472 19.2678 2.86436 19.2678 3.3332C19.2678 3.80204 19.0815 4.25168 18.75 4.5832L10.8333 12.4999L7.5 13.3332L8.33333 9.99986L16.25 2.0832Z"
                            stroke="#181818"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </g>
                        <defs>
                          <clipPath id="clip0_6133_36620">
                            <rect
                              width={20}
                              height={20}
                              fill="white"
                              transform="translate(0.833008)"
                            />
                          </clipPath>
                        </defs>
                      </svg>
                      <div className="text-caption-1">Note</div>
                    </div>
                  </div>
                  <div className="tf-mini-cart-bottom-wrap">
                    <div className="tf-cart-totals-discounts">
                      <h5>Subtotal</h5>
                      <h5 className="tf-totals-total-value">
                        <CurrencyFormatter price={totalPrice} />
                      </h5>
                    </div>
                    <div className="tf-cart-checkbox">
                      <div className="tf-checkbox-wrapp">
                        <input
                          className=""
                          type="checkbox"
                          id="CartDrawer-Form_agree"
                          name="agree_checkbox"
                        />
                        <div>
                          <i className="icon-check" />
                        </div>
                      </div>
                      <label htmlFor="CartDrawer-Form_agree">
                        I agree with
                        <Link href={`/${locale}/contact`} title="Terms of Service">
                          Terms &amp; Conditions
                        </Link>
                      </label>
                    </div>
                    <div className="tf-mini-cart-view-checkout">
                      <Link
                        href={`/${locale}/shopping-cart`}
                        className="tf-btn w-100 btn-white radius-4 has-border"
                      >
                        <span className="text">View cart</span>
                      </Link>
                      <Link
                        href={`/${locale}/shopping-cart`}
                        className="tf-btn w-100 btn-fill radius-4"
                      >
                        <span className="text">Check Out</span>
                      </Link>
                    </div>
                    <div className="text-center">
                      <Link
                        className="link text-btn-uppercase"
                        href={`/${locale}/shop-default-grid`}
                      >
                        Or continue shopping
                      </Link>
                    </div>
                  </div>
                </div>
                <div
                  className={`tf-mini-cart-tool-openable ${
                    currentOpenPopup == "add-note" ? "open" : ""
                  }`}
                >
                  <div className="tf-mini-cart-tool-content">
                    <label
                      htmlFor="Cart-note"
                      className="tf-mini-cart-tool-text"
                    >
                      <span className="icon">
                        <svg
                          width={20}
                          height={20}
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <g clipPath="url(#clip0_6766_32777)">
                            <path
                              d="M9.16699 3.33325H3.33366C2.89163 3.33325 2.46771 3.50885 2.15515 3.82141C1.84259 4.13397 1.66699 4.55789 1.66699 4.99992V16.6666C1.66699 17.1086 1.84259 17.5325 2.15515 17.8451C2.46771 18.1577 2.89163 18.3333 3.33366 18.3333H15.0003C15.4424 18.3333 15.8663 18.1577 16.1788 17.8451C16.4914 17.5325 16.667 17.1086 16.667 16.6666V10.8333"
                              stroke="#181818"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M15.417 2.0832C15.7485 1.75168 16.1981 1.56543 16.667 1.56543C17.1358 1.56543 17.5855 1.75168 17.917 2.0832C18.2485 2.41472 18.4348 2.86436 18.4348 3.3332C18.4348 3.80204 18.2485 4.25168 17.917 4.5832L10.0003 12.4999L6.66699 13.3332L7.50033 9.99986L15.417 2.0832Z"
                              stroke="#181818"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </g>
                          <defs>
                            <clipPath id="clip0_6766_32777">
                              <rect width={20} height={20} fill="white" />
                            </clipPath>
                          </defs>
                        </svg>
                      </span>
                      <span className="text-title">Note</span>
                    </label>
                    <form
                      className="form-add-note tf-mini-cart-tool-wrap"
                      onSubmit={(e) => e.preventDefault()}
                    >
                      <fieldset className="d-flex">
                        <textarea
                          name="note"
                          id="Cart-note"
                          placeholder="Add special instructions for your order..."
                          defaultValue={""}
                        />
                      </fieldset>
                      <div className="tf-cart-tool-btns">
                        <button type="submit" className="btn-style-2 w-100">
                          <span className="text text-btn-uppercase">Save</span>
                        </button>
                        <div
                          className="text-center w-100 text-btn-uppercase tf-mini-cart-tool-close"
                          onClick={() => setCurrentOpenPopup("")}
                        >
                          Cancel
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
