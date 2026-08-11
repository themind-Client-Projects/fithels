"use client";

import React from "react";
import CartModal from "@/components/modals/CartModal";
import QuickView from "@/components/modals/QuickView";
import QuickAdd from "@/components/modals/QuickAdd";
import Compare from "@/components/modals/Compare";
import MobileMenu from "@/components/modals/MobileMenu";
import NewsLetterModal from "@/components/modals/NewsLetterModal";
import SearchModal from "@/components/modals/SearchModal";
import SizeGuide from "@/components/modals/SizeGuide";
import Wishlist from "@/components/modals/Wishlist";
import Categories from "@/components/modals/Categories";
import AuthModal from "@/components/auth/AuthModal";

/**
 * Overlays mounted on every storefront page.
 *
 * They stay eagerly mounted on purpose: these are Bootstrap modals opened by
 * `data-bs-toggle` + `href="#id"`, and Bootstrap resolves the target with
 * `document.querySelector` at click time, so the node has to be in the DOM
 * before the first click. Lazy-loading them would break the first interaction.
 *
 * Three were removed because nothing could ever open them:
 *   - DemoModal      — the template's theme-switcher demo, zero triggers.
 *   - AccountSidebar — zero triggers, and it shipped a hardcoded stranger's
 *                      name and email ("Tony Nguyen") into every page.
 *   - RtlToggler     — a demo widget that rendered a stray "rtl/ltr" button on
 *                      the live storefront AND forced `document.dir` from
 *                      localStorage after hydration, so anyone who had clicked
 *                      it once saw the Arabic site rendered left-to-right,
 *                      fighting the dir the server had already set.
 */
export default function StorefrontProviders({ children }) {
  return (
    <>
      <div id="wrapper">{children}</div>
      <CartModal />
      <QuickView />
      <QuickAdd />
      <Compare />
      <MobileMenu />
      <NewsLetterModal />
      <SearchModal />
      <SizeGuide />
      <Wishlist />
      <Categories />
      <AuthModal />
    </>
  );
}
