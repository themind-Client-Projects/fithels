"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useContextElement } from "@/context/Context";
import { allProducts } from "@/data/products";
import CurrencyFormatter from "@/components/common/CurrencyFormatter";
import { useLocale } from "next-intl";

export default function Wishlist() {
  const locale = useLocale();
  const { removeFromWishlist, wishList } = useContextElement();
  const [items, setItems] = useState([]);
  useEffect(() => {
    setItems([...allProducts.filter((elm) => wishList.includes(elm.id))]);
  }, [wishList]);
  return (
    <div className="modal fullRight fade modal-wishlist" id="wishlist">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="header">
            <h5 className="title">Wish List</h5>
            <span
              className="icon-close icon-close-popup"
              data-bs-dismiss="modal"
            />
          </div>
          <div className="wrap">
            <div className="tf-mini-cart-wrap">
              <div className="tf-mini-cart-main">
                <div className="tf-mini-cart-sroll">
                  {items.length ? (
                    <div className="tf-mini-cart-items">
                      {items.map((elm, i) => (
                        <div key={i} className="tf-mini-cart-item file-delete">
                          <div className="tf-mini-cart-image">
                            <Image
                              className="lazyload"
                              alt=""
                              src={elm.imgSrc}
                              width={600}
                              height={800}
                            />
                          </div>
                          <div className="tf-mini-cart-info flex-grow-1">
                            <div className="mb_12 d-flex align-items-center justify-content-between flex-wrap gap-12">
                              <div className="text-title">
                                <Link
                                  href={`/${locale}/product-detail/${elm.id}`}
                                  className="link text-line-clamp-1"
                                >
                                  {elm.title}
                                </Link>
                              </div>
                              <div
                                className="text-button tf-btn-remove remove"
                                onClick={() => removeFromWishlist(elm.id)}
                              >
                                Remove
                              </div>
                            </div>
                            <div className="d-flex align-items-center justify-content-between flex-wrap gap-12">
                              <div className="text-secondary-2">
                                {[elm.selectedSize, elm.selectedColor]
                                  .filter(Boolean)
                                  .join(" / ")}
                              </div>
                              <div className="text-button">
                                <CurrencyFormatter price={elm.price} />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4">
                      Your wishlist is empty. Start adding your favorite
                      products to save them for later!{" "}
                      <Link className="btn-line" href={`/${locale}/shop-default-grid`}>
                        Explore Products
                      </Link>
                    </div>
                  )}
                </div>
              </div>
              <div className="tf-mini-cart-bottom">
                <Link
                  href={`/${locale}/shop-default-grid`}
                  className="text-btn-uppercase"
                >
                  Or continue shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
