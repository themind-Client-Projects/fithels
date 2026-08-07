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
import DemoModal from "@/components/modals/DemoModal";
import Categories from "@/components/modals/Categories";
import RtlToggler from "@/components/common/RtlToggler";
import AccountSidebar from "@/components/modals/AccountSidebar";
import AuthModal from "@/components/auth/AuthModal";

export default function StorefrontProviders({ children }) {
  return (
    <>
      <RtlToggler />
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
      <DemoModal />
      <Categories />
      <AccountSidebar />
      <AuthModal />
    </>
  );
}
