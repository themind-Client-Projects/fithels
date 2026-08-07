"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { PermissionProvider } from "@/components/dashboard/PermissionContext";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import DashboardTopNav from "@/components/dashboard/DashboardTopNav";

export default function DashboardLayout({ children }) {
  const { data: session, status } = useSession();
  const isLoaded = status !== "loading";
  const isSignedIn = status === "authenticated";
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const locale = params?.locale;
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loadingPerms, setLoadingPerms] = useState(true);

  useEffect(() => {
    if (locale && locale !== "ar") {
      const newPathname = pathname.replace(`/${locale}/`, "/ar/");
      router.replace(newPathname);
    }
  }, [locale, pathname, router]);

  useEffect(() => {
    async function fetchPermissions() {
      if (isLoaded && isSignedIn) {
        try {
          const res = await fetch("/api/auth/permissions");
          if (res.ok) {
            const data = await res.json();
            if (data.role !== 'ADMIN' && data.role !== 'EMPLOYEE') {
              router.push("/");
              return;
            }
            setRole(data.role);
            if (data.role === 'ADMIN') {
              setPermissions({
                canViewProducts: true, canCreateProducts: true, canEditProducts: true, canDeleteProducts: true,
                canViewOrders: true, canEditOrders: true, canDeleteOrders: true,
                canViewCustomers: true,
                canViewCategories: true, canCreateCategories: true, canEditCategories: true, canDeleteCategories: true,
                canViewSettings: true, canEditSettings: true,
                canViewDashboard: true,
              });
            } else {
              setPermissions(data.permissions || {});
            }
          } else {
            router.push("/");
          }
        } catch (error) {
          console.error("Error fetching permissions", error);
          router.push("/");
        } finally {
          setLoadingPerms(false);
        }
      }
    }
    fetchPermissions();
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn || loadingPerms) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f8f9fa] fixed inset-0 z-50">
        <div className="flex flex-col items-center gap-6">
          <div className="relative flex items-center justify-center">
            {/* Outer spinning ring */}
            <div className="absolute w-20 h-20 rounded-full border-[3px] border-transparent border-t-[#1a1a2e] border-b-[#16213e] animate-spin opacity-80" />
            
            {/* Inner Logo */}
            <div className="relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg"
                 style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)" }}>
              F
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <h3 className="text-lg font-bold text-[#1a1a2e]">لوحة التحكم</h3>
            <p className="text-sm font-medium text-[#6c757d] animate-pulse">جاري تهيئة النظام...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!role) return null;

  return (
    <PermissionProvider permissions={permissions}>
      <SidebarProvider>
        <DashboardSidebar />
        <SidebarInset style={{ backgroundColor: "#f8f9fa" }}>
          <DashboardTopNav />
          <div className="flex-1 flex flex-col overflow-auto">
            <main className="flex-1 w-full" style={{ padding: "2.5rem 2rem" }}>
              <div className="mx-auto" style={{ maxWidth: "1280px" }}>
                {children}
              </div>
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </PermissionProvider>
  );
}
