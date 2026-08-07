import type { OrderStatus } from "@/types";

/** Supported locales for i18n */
export const SUPPORTED_LOCALES = ["en", "ar"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** User roles */
export const ROLES = {
  CUSTOMER: "CUSTOMER",
  ADMIN: "ADMIN",
} as const;

/** Order status values and display config */
export const ORDER_STATUSES: Record<
  OrderStatus,
  { label: string; color: string }
> = {
  PENDING: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  CONFIRMED: { label: "Confirmed", color: "bg-blue-100 text-blue-800" },
  PROCESSING: { label: "Processing", color: "bg-purple-100 text-purple-800" },
  IN_DELIVERY: { label: "In Delivery", color: "bg-indigo-100 text-indigo-800" },
  DELIVERED: { label: "Delivered", color: "bg-green-100 text-green-800" },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-800" },
};

/** Navigation links for the storefront */
export const NAV_LINKS = [
  { href: "/", labelKey: "nav.home" },
  { href: "/shop", labelKey: "nav.shop" },
  { href: "/about", labelKey: "nav.about" },
  { href: "/contact", labelKey: "nav.contact" },
] as const;

/** Dashboard sidebar navigation */
export const DASHBOARD_NAV = [
  { href: "/dashboard", label: "Overview", icon: "LayoutDashboard" },
  { href: "/dashboard/products", label: "Products", icon: "Package" },
  { href: "/dashboard/orders", label: "Orders", icon: "ShoppingCart" },
  { href: "/dashboard/customers", label: "Customers", icon: "Users" },
  { href: "/dashboard/categories", label: "Categories", icon: "Tag" },
  { href: "/dashboard/settings", label: "Settings", icon: "Settings" },
] as const;
