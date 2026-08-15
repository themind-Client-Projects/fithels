"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useContextElement } from "@/context/Context";
import { useLocale, useTranslations } from "next-intl";
import CurrencyFormatter from "@/components/common/CurrencyFormatter";

/**
 * Cart drawer.
 *
 * Reduced to what the drawer is actually for: the items in the cart, the
 * subtotal, and a way to pay.
 *
 * What it replaced, and why none of it survived:
 *  - A "You May Also Like" strip that fetched /api/products?limit=6. This
 *    component mounts in the storefront layout, so that request fired on EVERY
 *    page load whether or not the drawer was ever opened, and it pushed the
 *    actual cart below the fold.
 *  - A free-shipping progress bar hardcoded to `width: 0%` that always read
 *    "Congratulations! You've got free shipping!" — it was never wired to a
 *    threshold, so it made a promise the checkout does not keep.
 *  - An order-note textarea whose contents were never read by anything: the
 *    form's only submit handler called preventDefault. Checkout has its own
 *    notes field that does reach the order.
 *  - A "I agree with Terms & Conditions" checkbox that gated nothing and
 *    pointed at /contact rather than any terms page.
 *  - Two buttons, "View cart" and "Check Out", which both linked to
 *    /shopping-cart — so the drawer offered no route to /checkout at all.
 *
 * Strings come from the shop/nav namespaces instead of the hardcoded English
 * the template shipped, which was rendering untranslated inside the RTL layout.
 */
export default function CartModal() {
  const tShop = useTranslations("shop");
  const tNav = useTranslations("nav");
  const { cartProducts, setCartProducts, totalPrice } = useContextElement();
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

  const hasItems = cartProducts.length > 0;

  return (
    <div className="modal fullRight fade modal-shopping-cart" id="shoppingCart">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="mini-cart">
            <div className="mini-cart__head">
              <h5 className="mini-cart__title">{tShop("shoppingCart")}</h5>
              <span
                className="icon-close icon-close-popup"
                data-bs-dismiss="modal"
              />
            </div>

            <div className="mini-cart__items">
              {hasItems ? (
                cartProducts.map((product, i) => {
                  const href = `/${locale}/product-detail/${product.id}`;
                  const variant = [product.selectedSize, product.selectedColor]
                    .filter(Boolean)
                    .join(" / ");
                  return (
                    <div
                      className="mini-cart__item"
                      key={product.lineKey ?? `${product.id}-${i}`}
                    >
                      {/* Dismissing on navigate: without it the drawer stays
                          open over the page the shopper just asked for. */}
                      <Link
                        href={href}
                        className="mini-cart__thumb"
                        data-bs-dismiss="modal"
                      >
                        <Image
                          src={product.imgSrc}
                          alt={product.title}
                          width={600}
                          height={800}
                        />
                      </Link>
                      <div className="mini-cart__info">
                        <Link
                          href={href}
                          className="mini-cart__name"
                          data-bs-dismiss="modal"
                        >
                          {product.title}
                        </Link>
                        {variant && (
                          <p className="mini-cart__variant">{variant}</p>
                        )}
                        <div className="mini-cart__row">
                          <span className="mini-cart__qty">
                            {product.quantity} ×{" "}
                            <CurrencyFormatter price={product.price} />
                          </span>
                          <button
                            type="button"
                            className="mini-cart__remove"
                            onClick={() => removeItem(product)}
                          >
                            {tShop("remove")}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="mini-cart__empty">
                  <p className="mini-cart__empty-title">
                    {tShop("emptyCart")}
                  </p>
                  <p className="mini-cart__empty-text">
                    {tShop("emptyCartDesc")}
                  </p>
                  <Link
                    className="btn-line"
                    href={`/${locale}/shop-default-grid`}
                    data-bs-dismiss="modal"
                  >
                    {tShop("exploreProducts")}
                  </Link>
                </div>
              )}
            </div>

            {hasItems && (
              <div className="mini-cart__foot">
                <div className="mini-cart__total">
                  <span>{tShop("subtotal")}</span>
                  <strong>
                    <CurrencyFormatter price={totalPrice} />
                  </strong>
                </div>
                <Link
                  href={`/${locale}/checkout`}
                  className="tf-btn w-100 btn-fill radius-4"
                  data-bs-dismiss="modal"
                >
                  <span className="text">{tNav("checkout")}</span>
                </Link>
                <Link
                  className="mini-cart__continue"
                  href={`/${locale}/shop-default-grid`}
                  data-bs-dismiss="modal"
                >
                  {tShop("continueShopping")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
