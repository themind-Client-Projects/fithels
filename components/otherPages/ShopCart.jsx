"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useContextElement } from "@/context/Context";
import CurrencyFormatter from "@/components/common/CurrencyFormatter";

export default function ShopCart() {
  const { cartProducts, setCartProducts, totalPrice } = useContextElement();

  // Cart lines are identified by product AND variant. Matching on the product
  // id alone meant pressing + on the "L" row incremented the "M" row, and
  // removing one size deleted every size and colour of that product at once.
  const lineIdOf = (item) => item.lineKey ?? item.id;

  const setQuantity = (item, quantity) => {
    if (quantity < 1) return;
    const target = lineIdOf(item);
    // Immutable: the previous version mutated the object held in state.
    setCartProducts((pre) =>
      pre.map((elm) =>
        lineIdOf(elm) === target ? { ...elm, quantity } : elm
      )
    );
  };

  const removeItem = (item) => {
    const target = lineIdOf(item);
    setCartProducts((pre) => pre.filter((elm) => lineIdOf(elm) !== target));
  };

  return (
    <>
      <section className="flat-spacing">
        <div className="container">
          <div className="row">
            <div className="col-xl-8">
              {cartProducts.length ? (
                <form onSubmit={(e) => e.preventDefault()}>
                  <table className="tf-table-page-cart">
                    <thead>
                      <tr>
                        <th>Products</th>
                        <th>Price</th>
                        <th>Quantity</th>
                        <th>Total Price</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {cartProducts.map((elm, i) => (
                        <tr key={i} className="tf-cart-item file-delete">
                          <td className="tf-cart-item_product">
                            <Link
                              href={`/product-detail/${elm.id}`}
                              className="img-box"
                            >
                              <Image
                                alt="product"
                                src={elm.imgSrc}
                                width={600}
                                height={800}
                              />
                            </Link>
                            <div className="cart-info">
                              <Link
                                href={`/product-detail/${elm.id}`}
                                className="cart-title link"
                              >
                                {elm.title}
                              </Link>
                              {(elm.selectedSize || elm.selectedColor) && (
                                <div className="text-secondary-2">
                                  {[elm.selectedSize, elm.selectedColor]
                                    .filter(Boolean)
                                    .join(" / ")}
                                </div>
                              )}
                            </div>
                          </td>
                          <td
                            data-cart-title="Price"
                            className="tf-cart-item_price text-center"
                          >
                            <div className="cart-price text-button price-on-sale">
                              <CurrencyFormatter price={elm.price} />
                            </div>
                          </td>
                          <td
                            data-cart-title="Quantity"
                            className="tf-cart-item_quantity"
                          >
                            <div className="wg-quantity mx-md-auto">
                              <span
                                className="btn-quantity btn-decrease"
                                onClick={() =>
                                  setQuantity(elm, elm.quantity - 1)
                                }
                              >
                                -
                              </span>
                              <input
                                type="text"
                                className="quantity-product"
                                name="number"
                                value={elm.quantity}
                                readOnly
                              />
                              <span
                                className="btn-quantity btn-increase"
                                onClick={() =>
                                  setQuantity(elm, elm.quantity + 1)
                                }
                              >
                                +
                              </span>
                            </div>
                          </td>
                          <td
                            data-cart-title="Total"
                            className="tf-cart-item_total text-center"
                          >
                            <div className="cart-total text-button total-price">
                              <CurrencyFormatter price={elm.price * elm.quantity} />
                            </div>
                          </td>
                          <td
                            data-cart-title="Remove"
                            className="remove-cart"
                            onClick={() => removeItem(elm)}
                          >
                            <span className="remove icon icon-close" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </form>
              ) : (
                <div>
                  Your cart is empty. Start adding your favorite products!{" "}
                  <Link className="btn-line" href="/shop-default-grid">
                    Explore Products
                  </Link>
                </div>
              )}
            </div>
            <div className="col-xl-4">
              <div className="fl-sidebar-cart">
                <div className="box-order bg-surface">
                  <h5 className="title">Order Summary</h5>
                  <div className="subtotal text-button d-flex justify-content-between align-items-center">
                    <span>Subtotal</span>
                    <span className="total"><CurrencyFormatter price={totalPrice} /></span>
                  </div>
                  <h5 className="total-order d-flex justify-content-between align-items-center">
                    <span>Total</span>
                    <span className="total">
                      <CurrencyFormatter price={totalPrice ? totalPrice : 0} />
                    </span>
                  </h5>
                  <div className="box-progress-checkout">
                    <p className="text-caption-1 text-secondary" style={{ marginBottom: "12px" }}>
                      We will contact you to confirm your order details and delivery.
                    </p>
                    <Link href={`/checkout`} className="tf-btn btn-reset">
                      Place Order
                    </Link>
                    <p className="text-button text-center" style={{ marginTop: "10px" }}>
                      <Link href="/shop-default-grid">Or continue shopping</Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
