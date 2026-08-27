"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS, hasPermission } from "@/lib/permissions";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BarChart3,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Tags,
  LogOut,
  ChevronsUpDown,
  Store,
  Settings,
  Sparkles,
  TicketPercent,
} from "lucide-react";

export default function DashboardSidebar() {
  const pathname = usePathname();
  const params = useParams();
  const locale = params?.locale || "ar";
  const permissions = usePermissions();
  const { data: session } = useSession();
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const user = session?.user;
  const t = useTranslations("Dashboard");

  const dbUser = {
    role: user?.role || 'EMPLOYEE',
    permissions: permissions,
  };

  const navItems = [
    { title: t("overview"), url: `/${locale}/dashboard`, icon: LayoutDashboard, permission: PERMISSIONS.VIEW_DASHBOARD },
    { title: t("orders"), url: `/${locale}/dashboard/orders`, icon: ShoppingCart, permission: PERMISSIONS.VIEW_ORDERS },
    { title: t("products"), url: `/${locale}/dashboard/products`, icon: Package, permission: PERMISSIONS.VIEW_PRODUCTS },
    { title: t("categories"), url: `/${locale}/dashboard/categories`, icon: Tags, permission: PERMISSIONS.VIEW_CATEGORIES },
    { title: t("customers"), url: `/${locale}/dashboard/customers`, icon: Users, permission: PERMISSIONS.VIEW_CUSTOMERS },
    // Reads across orders, customers and stock, so it sits behind the same
    // permission as the overview it expands on.
    { title: t("analytics"), url: `/${locale}/dashboard/analytics`, icon: BarChart3, permission: PERMISSIONS.VIEW_DASHBOARD },
    { title: "البانرات", url: `/${locale}/dashboard/banners`, icon: Sparkles, permission: PERMISSIONS.VIEW_SETTINGS },
    { title: "الكوبونات", url: `/${locale}/dashboard/coupons`, icon: TicketPercent, permission: PERMISSIONS.VIEW_SETTINGS },
  ];

  const visibleItems = navItems.filter((item) => hasPermission(dbUser, item.permission));

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    : user?.email?.substring(0, 2).toUpperCase() || 'AD';

  return (
    <Sidebar collapsible="icon" side="right" className="border-s">
      {/* Header — Brand */}
      <SidebarHeader style={{ padding: "1rem" }}>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href={`/${locale}/dashboard`} />} className="hover:bg-transparent" style={{ paddingRight: "1rem", paddingLeft: "1rem" }}>
              <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="size-5" />
              </div>
              <div className="grid flex-1 text-start text-sm leading-tight ms-3">
                <span className="truncate font-bold text-base">AdminFit</span>
                <span className="truncate text-xs font-medium text-muted-foreground">لوحة التحكم</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Navigation */}
      <SidebarContent style={{ padding: "0 0.75rem" }}>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2" style={{ paddingRight: "1rem", paddingLeft: "1rem" }}>
            {t("management")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {visibleItems.map((item) => {
                const isActive = pathname === item.url || 
                  (item.url !== `/${locale}/dashboard` && pathname.startsWith(`${item.url}/`));
                const isExactDashboard = item.url === `/${locale}/dashboard` && pathname === `/${locale}/dashboard`;
                const active = isActive || isExactDashboard;

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      render={<Link href={item.url} />} 
                      isActive={active} 
                      tooltip={item.title}
                      size="lg"
                      className="rounded-xl transition-all duration-200"
                      style={{ paddingRight: "1rem", paddingLeft: "1rem" }}
                    >
                      <item.icon className="size-5 me-3 text-muted-foreground group-data-[active=true]/menu-button:text-primary" />
                      <span className="text-sm font-medium">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  render={<Link href={`/${locale}/dashboard/settings`} />}
                  tooltip={t("settings")}
                  className="rounded-xl transition-all duration-200"
                  style={{ paddingRight: "1rem", paddingLeft: "1rem" }}
                >
                  <Settings className="size-5 me-3 text-muted-foreground group-hover/menu-button:text-primary" />
                  <span className="text-sm font-medium">{t("settings")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                {/* A plain <a>, not a Link, deliberately — the mirror of the
                    dashboard link in the storefront header.
                    Next keeps a route's stylesheet in the document across
                    client-side navigations. Soft-navigating out to the store
                    would load the template stylesheet on top of the dashboard's,
                    and it would still be there on the next soft navigation back
                    in — reintroducing exactly the mis-styled dashboard this
                    pair of hard links exists to prevent. */}
                <SidebarMenuButton
                  size="lg"
                  render={<a href={`/${locale}`} />}
                  tooltip={t("storefront")}
                  className="rounded-xl transition-all duration-200"
                  style={{ paddingRight: "1rem", paddingLeft: "1rem" }}
                >
                  <Store className="size-5 me-3 text-muted-foreground group-hover/menu-button:text-primary" />
                  <span className="text-sm font-medium">{t("storefront")}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer — User Profile */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  />
                }
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user?.image} alt={user?.name || "User"} />
                  <AvatarFallback className="rounded-lg text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-semibold">{user?.name || "Admin"}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user?.email}
                  </span>
                </div>
                <ChevronsUpDown className="ms-auto size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="top"
                align="end"
                sideOffset={4}
              >
                <div className="p-3 font-normal">
                  <div className="flex items-center gap-3 text-start text-sm">
                    <Avatar className="h-10 w-10 rounded-xl border border-border/50 shadow-sm">
                      <AvatarImage src={user?.image} alt={user?.name || "User"} />
                      <AvatarFallback className="rounded-xl text-sm font-bold bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-start text-sm leading-tight overflow-hidden">
                      <span className="truncate font-bold text-base text-foreground">{user?.name || "Admin"}</span>
                      <span className="truncate text-xs font-medium text-muted-foreground mt-0.5" dir="ltr" style={{ textAlign: 'right' }}>
                        {user?.email}
                      </span>
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator className="opacity-50" />
                <div className="p-1.5">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      setIsSigningOut(true);
                      signOut({ callbackUrl: '/' });
                    }}
                    disabled={isSigningOut}
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer rounded-lg py-2.5 px-3 font-bold transition-colors"
                  >
                    {isSigningOut ? (
                      <div className="me-3 animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    ) : (
                      <LogOut className="me-3 size-4" />
                    )}
                    {isSigningOut ? t("signingOut") : t("signOut")}
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
