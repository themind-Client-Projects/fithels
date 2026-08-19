"use client";
import React from "react";
import Nav from "./Nav";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import CartLength from "../common/CartLength";
import { useUIStore } from "@/stores/useUIStore";
import { useSession, signOut } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";

export default function Header1({ fullWidth = false }) {
  const locale = useLocale();
  const { openAuth } = useUIStore();
  const { data: session, status } = useSession();
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const isLoaded = status !== "loading";
  const isSignedIn = status === "authenticated";
  const user = session?.user;
  const t = useTranslations("nav");

  return (
    <header
      id="header"
      className={`header-default ${fullWidth ? "header-fullwidth" : ""} `}
    >
      <div className={fullWidth ? "" : "container"}>
        <div className="row wrapper-header align-items-center">
          <div className="col-md-4 col-3 d-xl-none">
            <a
              href="#mobileMenu"
              className="mobile-menu"
              data-bs-toggle="offcanvas"
              aria-controls="mobileMenu"
            >
              <i className="icon icon-categories" />
            </a>
          </div>
          <div className="col-xl-3 col-md-4 col-6">
            <Link href="/" className="logo-header" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Image
                alt="logo"
                className="logo"
                src="/images/logo/logo.svg"
                width={16}
                height={46}
                style={{ maxHeight: "46", width: "auto" }}
              />
            </Link>
          </div>
          <div className="col-xl-6 d-none d-xl-block">
            <nav className="box-navigation text-center">
              <ul className="box-nav-ul d-flex align-items-center justify-content-center">
                <Nav />
              </ul>
            </nav>
          </div>
          <div className="col-xl-3 col-md-4 col-3">
            <ul className="nav-icon d-flex justify-content-end align-items-center">
              <li className="nav-search">
                <a
                  href="#search"
                  data-bs-toggle="modal"
                  className="nav-icon-item"
                >
                  <svg
                    className="icon"
                    width={24}
                    height={24}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z"
                      stroke="#181818"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M21.35 21.0004L17 16.6504"
                      stroke="#181818"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              </li>
              <li className="nav-account">
                <a href="#" className="nav-icon-item" onClick={(e) => { e.preventDefault(); if(!isSignedIn) openAuth("signIn"); }}>
                  {isLoaded && isSignedIn ? (
                    <span style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #1a1a2e, #16213e)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: "700",
                      letterSpacing: "0.02em",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    }}>
                      {user?.name ? user.name[0].toUpperCase() : user?.email?.[0]?.toUpperCase() || "U"}
                    </span>
                  ) : (
                    <svg
                      className="icon"
                      width={24}
                      height={24}
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21"
                        stroke="#181818"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z"
                        stroke="#181818"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </a>
                <div className="dropdown-account dropdown-login">
                  {!isLoaded ? (
                    /* ── Loading Skeleton ── */
                    <div style={{ padding: "20px 24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <div style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "50%",
                          background: "#e8e8e8",
                          animation: "pulse 1.5s ease-in-out infinite",
                          flexShrink: 0,
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{
                            width: "100px",
                            height: "14px",
                            borderRadius: "6px",
                            background: "#e8e8e8",
                            marginBottom: "8px",
                            animation: "pulse 1.5s ease-in-out infinite",
                          }} />
                          <div style={{
                            width: "140px",
                            height: "12px",
                            borderRadius: "6px",
                            background: "#e8e8e8",
                            animation: "pulse 1.5s ease-in-out infinite",
                          }} />
                        </div>
                      </div>
                    </div>
                  ) : isSignedIn ? (
                    /* ── Signed-in User Profile ── */
                    <>
                      <div style={{ padding: "20px 24px", borderBottom: "1px solid #f0f0f0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                          <div style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #1a1a2e, #16213e)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: "16px",
                            fontWeight: "700",
                            letterSpacing: "0.02em",
                            flexShrink: 0,
                          }}>
                            {user.name ? user.name[0].toUpperCase() : user.email?.[0]?.toUpperCase()}
                          </div>
                          <div style={{ overflow: "hidden", minWidth: 0 }}>
                            <p style={{
                              fontWeight: 600,
                              fontSize: "15px",
                              lineHeight: "1.3",
                              marginBottom: "3px",
                              color: "#181818",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}>
                              {user.name || "User"}
                            </p>
                            <p style={{
                              fontSize: "13px",
                              lineHeight: "1.3",
                              margin: 0,
                              color: "#888",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              direction: "ltr",
                              textAlign: "right",
                            }}>
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div style={{ padding: "12px 24px 16px" }}>
                        {(user.role === 'ADMIN' || user.role === 'EMPLOYEE') && (
                          /* A plain <a>, not a Link, deliberately.
                             Next keeps a route's stylesheet in the document
                             across client-side navigations, so soft-navigating
                             from the storefront into the dashboard leaves the
                             template stylesheet loaded on top of it — which is
                             why the dashboard appeared in the template's styling
                             until the page was reloaded. A full document load
                             discards it, so the dashboard always starts with
                             only its own css. */
                          <a href={`/${locale}/dashboard`} className="profile-dropdown-link" style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "10px 0",
                            fontWeight: 500,
                            fontSize: "14px",
                            color: "#181818",
                            borderBottom: "1px solid #f5f5f5",
                            transition: "color 0.2s ease",
                            textDecoration: "none",
                          }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                            {t("dashboard")}
                          </a>
                        )}
                        <Link href="/account" className="profile-dropdown-link" style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px 0",
                          fontWeight: 500,
                          fontSize: "14px",
                          color: "#181818",
                          borderBottom: "1px solid #f5f5f5",
                          transition: "color 0.2s ease",
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          My Account
                        </Link>
                        <button onClick={() => {
                          setIsSigningOut(true);
                          signOut();
                        }} disabled={isSigningOut} className="profile-dropdown-link" style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px 0",
                          fontWeight: 500,
                          fontSize: "14px",
                          color: "#181818",
                          borderTop: "1px solid #f5f5f5",
                          marginTop: "8px",
                          width: "100%",
                          textAlign: "left",
                          background: "none",
                          borderBottom: "none",
                          borderRight: "none",
                          borderLeft: "none",
                          cursor: isSigningOut ? "not-allowed" : "pointer",
                          opacity: isSigningOut ? 0.7 : 1,
                          justifyContent: "flex-start",
                        }}>
                          {isSigningOut ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                          )}
                          {t("signOut", { defaultMessage: "Sign Out" })}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="sub-top">
                        <button onClick={() => openAuth("signIn")} className="tf-btn btn-reset" style={{ width: "100%" }}>
                          {t("login")}
                        </button>
                        <p className="text-center text-secondary-2">
                          {t("noAccount", { defaultMessage: "Don't have an account?" })}{" "}
                          <button onClick={() => openAuth("signUp")} style={{ border: "none", background: "none", padding: 0, color: "#181818", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>{t("register")}</button>
                        </p>
                      </div>
                      <div className="sub-bot">
                        <span className="body-text-">{t("support", { defaultMessage: "Support" })}</span>
                      </div>
                    </>
                  )}
                </div>
              </li>
              <li className="nav-wishlist">
                <a href="#shopWishlist" data-bs-toggle="offcanvas" aria-controls="shopWishlist" className="nav-icon-item" role="button">
                  <svg
                    className="icon"
                    width={24}
                    height={24}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M20.8401 4.60987C20.3294 4.09888 19.7229 3.69352 19.0555 3.41696C18.388 3.14039 17.6726 2.99805 16.9501 2.99805C16.2276 2.99805 15.5122 3.14039 14.8448 3.41696C14.1773 3.69352 13.5709 4.09888 13.0601 4.60987L12.0001 5.66987L10.9401 4.60987C9.90843 3.57818 8.50915 2.99858 7.05012 2.99858C5.59109 2.99858 4.19181 3.57818 3.16012 4.60987C2.12843 5.64156 1.54883 7.04084 1.54883 8.49987C1.54883 9.95891 2.12843 11.3582 3.16012 12.3899L4.22012 13.4499L12.0001 21.2299L19.7801 13.4499L20.8401 12.3899C21.3511 11.8791 21.7565 11.2727 22.033 10.6052C22.3096 9.93777 22.4519 9.22236 22.4519 8.49987C22.4519 7.77738 22.3096 7.06198 22.033 6.39452C21.7565 5.72706 21.3511 5.12063 20.8401 4.60987V4.60987Z"
                      stroke="#181818"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </a>
              </li>
              <li className="nav-cart">
                <a
                  href="#shoppingCart"
                  data-bs-toggle="modal"
                  className="nav-icon-item"
                >
                  <svg
                    className="icon"
                    width={24}
                    height={24}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M16.5078 10.8734V6.36686C16.5078 5.17166 16.033 4.02541 15.1879 3.18028C14.3428 2.33514 13.1965 1.86035 12.0013 1.86035C10.8061 1.86035 9.65985 2.33514 8.81472 3.18028C7.96958 4.02541 7.49479 5.17166 7.49479 6.36686V10.8734M4.11491 8.62012H19.8877L21.0143 22.1396H2.98828L4.11491 8.62012Z"
                      stroke="#181818"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="count-box">
                    <CartLength />
                  </span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
}
