"use client";
import React, { useEffect, useState } from "react";
import Slider1 from "../sliders/Slider1";
import ColorSelect from "../ColorSelect";
import SizeSelect from "../SizeSelect";
import QuantitySelect from "../QuantitySelect";
import Image from "next/image";
import { useContextElement } from "@/context/Context";
import ProductStikyBottom from "../ProductStikyBottom";
import CurrencyFormatter from "@/components/common/CurrencyFormatter";
export default function Details1({ product }) {
  const [activeColor, setActiveColor] = useState("gray");
  const [quantity, setQuantity] = useState(1);
  const {
    addProductToCart,
    isAddedToCartProducts,
    addToWishlist,
    isAddedtoWishlist,
    isAddedtoCompareItem,
    addToCompareItem,
    cartProducts,
    updateQuantity,
  } = useContextElement();

  return (
    <section className="flat-spacing">
      <div className="tf-main-product section-image-zoom">
        <div className="container">
          <div className="row">
            {/* Product default */}
            <div className="col-md-6">
              <div className="tf-product-media-wrap sticky-top">
                <Slider1
                  setActiveColor={setActiveColor}
                  activeColor={activeColor}
                  firstItem={product.imgSrc}
                />
              </div>
            </div>
            {/* /Product default */}
            {/* tf-product-info-list */}
            <div className="col-md-6">
              <div className="tf-product-info-wrap position-relative mw-100p-hidden ">
                <div className="tf-zoom-main" />
                <div className="tf-product-info-list other-image-zoom">
                  <div className="tf-product-info-heading">
                    <div className="tf-product-info-name">
                      <div className="text text-btn-uppercase">Clothing</div>
                      <h3 className="name">{product.title}</h3>
                      <div className="sub">
                        <div className="tf-product-info-rate">
                          <div className="list-star">
                            <i className="icon icon-star" />
                            <i className="icon icon-star" />
                            <i className="icon icon-star" />
                            <i className="icon icon-star" />
                            <i className="icon icon-star" />
                          </div>
                          <div className="text text-caption-1">
                            (134 reviews)
                          </div>
                        </div>
                        <div className="tf-product-info-sold">
                          <i className="icon icon-lightning" />
                          <div className="text text-caption-1">
                            18&nbsp;sold in last&nbsp;32&nbsp;hours
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="tf-product-info-desc">
                      <div className="tf-product-info-price">
                        <h5 className="price-on-sale font-2">
                          {" "}
                          <CurrencyFormatter price={product.price} />
                        </h5>
                        {product.oldPrice ? (
                          <>
                            <div className="compare-at-price font-2">
                              {" "}
                              <CurrencyFormatter price={product.oldPrice} />
                            </div>
                            <div className="badges-on-sale text-btn-uppercase">
                              -25%
                            </div>
                          </>
                        ) : (
                          ""
                        )}
                      </div>
                      <p>
                        The garments labelled as Committed are products that
                        have been produced using sustainable fibres or
                        processes, reducing their environmental impact.
                      </p>
                      <div className="tf-product-info-liveview">
                        <i className="icon icon-eye" />
                        <p className="text-caption-1">
                          <span className="liveview-count">28</span> people are
                          viewing this right now
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="tf-product-info-choose-option">
                    <ColorSelect
                      setActiveColor={setActiveColor}
                      activeColor={activeColor}
                    />
                    <SizeSelect />
                    <div className="tf-product-info-quantity">
                      <div className="title mb_12">Quantity:</div>
                      <QuantitySelect
                        quantity={
                          isAddedToCartProducts(product.id)
                            ? cartProducts.filter(
                                (elm) => elm.id == product.id
                              )[0].quantity
                            : quantity
                        }
                        setQuantity={(qty) => {
                          if (isAddedToCartProducts(product.id)) {
                            updateQuantity(product.id, qty);
                          } else {
                            setQuantity(qty);
                          }
                        }}
                      />
                    </div>
                    <div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px', marginTop: '16px' }}>
                        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                          <button
                            onClick={() => addProductToCart(product.id, quantity)}
                            style={{
                              flexGrow: 1,
                              backgroundColor: '#f2b5c4', // Elegant pink
                              color: '#111',
                              border: 'none',
                              padding: '18px 24px',
                              fontSize: '12px',
                              letterSpacing: '0.2em',
                              textTransform: 'uppercase',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              gap: '12px',
                              transition: 'background-color 0.3s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e8a4b4'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f2b5c4'}
                          >
                            <span>
                              {isAddedToCartProducts(product.id)
                                ? "Already Added"
                                : "Add to cart —"}
                            </span>
                            <span>
                              $
                              {isAddedToCartProducts(product.id)
                                ? (
                                    product.price *
                                    cartProducts.filter(
                                      (elm) => elm.id == product.id
                                    )[0].quantity
                                  ).toFixed(2)
                                : (product.price * quantity).toFixed(2)}
                            </span>
                          </button>
                          
                          <button
                            onClick={() => addToCompareItem(product.id)}
                            style={{
                              width: '56px',
                              height: '56px',
                              border: '1px solid #e5e5e5',
                              backgroundColor: 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              flexShrink: 0,
                              transition: 'border-color 0.3s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.borderColor = '#111'}
                            onMouseOut={(e) => e.currentTarget.style.borderColor = '#e5e5e5'}
                            title="Compare"
                          >
                            <span className="icon icon-gitDiff" style={{ fontSize: '22px', color: '#666', transition: 'color 0.3s ease' }} onMouseOver={(e) => e.target.style.color = '#111'} onMouseOut={(e) => e.target.style.color = '#666'} />
                          </button>
                          
                          <button
                            onClick={() => addToWishlist(product.id)}
                            style={{
                              width: '56px',
                              height: '56px',
                              border: '1px solid #e5e5e5',
                              backgroundColor: 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              flexShrink: 0,
                              transition: 'border-color 0.3s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.borderColor = '#111'}
                            onMouseOut={(e) => e.currentTarget.style.borderColor = '#e5e5e5'}
                            title="Wishlist"
                          >
                            <span className={`icon icon-heart`} style={{ fontSize: '22px', color: isAddedtoWishlist(product.id) ? '#111' : '#666', transition: 'color 0.3s ease' }} onMouseOver={(e) => e.target.style.color = '#111'} onMouseOut={(e) => { if(!isAddedtoWishlist(product.id)) e.target.style.color = '#666' }} />
                          </button>
                        </div>
                        
                        <button
                          style={{
                            width: '100%',
                            backgroundColor: '#111',
                            color: '#fff',
                            border: 'none',
                            padding: '18px 24px',
                            fontSize: '12px',
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            transition: 'background-color 0.3s ease'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#333'}
                          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#111'}
                        >
                          Buy it now
                        </button>
                      </div>
                    </div>                    <div style={{ borderTop: '1px solid #e5e5e5', paddingTop: '32px', marginTop: '32px' }}>
                      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center', fontSize: '14px', color: '#666', fontWeight: '500' }}>
                        <a
                          href="#delivery_return"
                          data-bs-toggle="modal"
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666', textDecoration: 'none', transition: 'color 0.3s ease' }}
                          onMouseOver={(e) => e.currentTarget.style.color = '#111'}
                          onMouseOut={(e) => e.currentTarget.style.color = '#666'}
                        >
                          <i className="icon-shipping" style={{ fontSize: '18px' }} />
                          <span style={{ letterSpacing: '0.03em' }}>Delivery & Return</span>
                        </a>
                        <a
                          href="#ask_question"
                          data-bs-toggle="modal"
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666', textDecoration: 'none', transition: 'color 0.3s ease' }}
                          onMouseOver={(e) => e.currentTarget.style.color = '#111'}
                          onMouseOut={(e) => e.currentTarget.style.color = '#666'}
                        >
                          <i className="icon-question" style={{ fontSize: '18px' }} />
                          <span style={{ letterSpacing: '0.03em' }}>Ask A Question</span>
                        </a>
                        <a
                          href="#share_social"
                          data-bs-toggle="modal"
                          style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666', textDecoration: 'none', transition: 'color 0.3s ease' }}
                          onMouseOver={(e) => e.currentTarget.style.color = '#111'}
                          onMouseOut={(e) => e.currentTarget.style.color = '#666'}
                        >
                          <i className="icon-share" style={{ fontSize: '18px' }} />
                          <span style={{ letterSpacing: '0.03em' }}>Share</span>
                        </a>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px', fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <i className="icon-timer" style={{ fontSize: '20px', marginTop: '2px', color: '#444' }} />
                          <p style={{ margin: 0 }}>
                            <span style={{ color: '#111', fontWeight: '600' }}>Estimated Delivery:</span> 12-26 days (International), 3-6 days (United States)
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <i className="icon-arrowClockwise" style={{ fontSize: '20px', marginTop: '2px', color: '#444' }} />
                          <p style={{ margin: 0 }}>
                            <span style={{ color: '#111', fontWeight: '600' }}>Return Policy:</span> Return within 45 days of purchase. Duties & taxes are non-refundable.
                          </p>
                        </div>
                        <div className="dropdown dropdown-store-location" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <div
                            className="dropdown-title dropdown-backdrop"
                            data-bs-toggle="dropdown"
                            aria-haspopup="true"
                            style={{ width: '100%' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: '#666', transition: 'color 0.3s ease' }} onMouseOver={(e) => e.currentTarget.style.color = '#111'} onMouseOut={(e) => e.currentTarget.style.color = '#666'}>
                              <i className="icon-map-pin" style={{ fontSize: '20px', color: '#444' }} />
                              <span style={{ textDecoration: 'underline', textUnderlineOffset: '4px', textDecorationColor: '#d1d5db', letterSpacing: '0.03em' }}>View Store Information</span>
                            </div>
                          </div>
                          <div className="dropdown-menu dropdown-menu-end">
                            <div className="dropdown-content">
                              <div className="dropdown-content-heading">
                                <h5>Store Location</h5>
                                <i className="icon icon-close" />
                              </div>
                              <div className="line-bt" />
                              <div>
                                <h6>Fit Women Heels</h6>
                                <p>Pickup available. Usually ready in 24 hours</p>
                              </div>
                              <div>
                                <p>766 Rosalinda Forges Suite 044,</p>
                                <p>Gracielahaven, Oregon</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '32px 0 0 0', padding: 0, listStyle: 'none', borderTop: '1px solid #e5e5e5', paddingTop: '32px' }}>
                      <li style={{ display: 'flex', gap: '8px', fontSize: '14px' }}>
                        <span style={{ color: '#111', fontWeight: '600', minWidth: '90px' }}>SKU:</span>
                        <span style={{ color: '#666' }}>53453412</span>
                      </li>
                      <li style={{ display: 'flex', gap: '8px', fontSize: '14px' }}>
                        <span style={{ color: '#111', fontWeight: '600', minWidth: '90px' }}>Vendor:</span>
                        <span style={{ color: '#666' }}>Fit Women Heels</span>
                      </li>
                      <li style={{ display: 'flex', gap: '8px', fontSize: '14px' }}>
                        <span style={{ color: '#111', fontWeight: '600', minWidth: '90px' }}>Available:</span>
                        <span style={{ color: '#10b981', fontWeight: '500' }}>In Stock</span>
                      </li>
                      <li style={{ display: 'flex', gap: '8px', fontSize: '14px' }}>
                        <span style={{ color: '#111', fontWeight: '600', minWidth: '90px' }}>Categories:</span>
                        <span style={{ color: '#666' }}>
                          <a href="#" style={{ color: '#666', textDecoration: 'none' }} onMouseOver={(e) => e.target.style.color = '#111'} onMouseOut={(e) => e.target.style.color = '#666'}>Shoes</a>
                          {', '}
                          <a href="#" style={{ color: '#666', textDecoration: 'none' }} onMouseOver={(e) => e.target.style.color = '#111'} onMouseOut={(e) => e.target.style.color = '#666'}>Heels</a>
                          {', '}
                          <a href="#" style={{ color: '#666', textDecoration: 'none' }} onMouseOver={(e) => e.target.style.color = '#111'} onMouseOut={(e) => e.target.style.color = '#666'}>Pumps</a>
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            {/* /tf-product-info-list */}
          </div>
        </div>
      </div>
      <ProductStikyBottom />
    </section>
  );
}
