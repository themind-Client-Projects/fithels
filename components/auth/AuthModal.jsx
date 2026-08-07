"use client";

import React from "react";
import { useSession, signIn } from "next-auth/react";
import { useUIStore } from "@/stores/useUIStore";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function AuthModal() {
  const { authModalOpen, closeAuth } = useUIStore();
  const { status } = useSession();
  const [isSigningIn, setIsSigningIn] = React.useState(false);

  // If user is already authenticated, close the modal
  if (status === "authenticated" && authModalOpen) {
    closeAuth();
  }

  const handleGoogleSignIn = () => {
    setIsSigningIn(true);
    signIn("google", { callbackUrl: window.location.href });
  };

  return (
    <Dialog open={authModalOpen} onOpenChange={closeAuth}>
      <DialogContent className="sm:max-w-[400px] p-0 border-none bg-white shadow-2xl rounded-2xl overflow-hidden" showCloseButton={false}>
        <div style={{ padding: "40px 32px", textAlign: "center" }}>
          {/* Logo / Brand */}
          <div style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #1a1a2e, #16213e)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            color: "#fff",
            fontSize: "24px",
            fontWeight: "800",
          }}>
            F
          </div>

          <h2 style={{
            fontSize: "22px",
            fontWeight: "700",
            color: "#181818",
            marginBottom: "8px",
          }}>
            تسجيل الدخول
          </h2>
          <p style={{
            fontSize: "14px",
            color: "#888",
            marginBottom: "32px",
            lineHeight: "1.6",
          }}>
            سجّل دخولك باستخدام حساب Google الخاص بك
          </p>

          <button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              padding: "14px 24px",
              borderRadius: "12px",
              border: "1px solid #e0e0e0",
              background: "#fff",
              cursor: isSigningIn ? "not-allowed" : "pointer",
              opacity: isSigningIn ? 0.7 : 1,
              fontSize: "15px",
              fontWeight: "600",
              color: "#333",
              transition: "all 0.2s ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
            onMouseEnter={(e) => {
              if (isSigningIn) return;
              e.currentTarget.style.background = "#f8f9fa";
              e.currentTarget.style.borderColor = "#c0c0c0";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.12)";
            }}
            onMouseLeave={(e) => {
              if (isSigningIn) return;
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.borderColor = "#e0e0e0";
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)";
            }}
          >
            {isSigningIn ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {isSigningIn ? "جاري تسجيل الدخول..." : "المتابعة بحساب Google"}
          </button>

          <p style={{
            fontSize: "12px",
            color: "#aaa",
            marginTop: "24px",
            lineHeight: "1.5",
          }}>
            بالمتابعة، أنت توافق على شروط الاستخدام وسياسة الخصوصية
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
