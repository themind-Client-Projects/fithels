import SessionProvider from "@/components/providers/SessionProvider";
import ClientProviders from "./ClientProviders";

import "./globals.css";

export const metadata = {
  title: "Fit Women Heels",
  description: "Premium heels for women.",
};

export default function RootLayout({ children }) {
  return (
    <SessionProvider>
      <html lang="ar" dir="rtl" suppressHydrationWarning>
        <body className="preload-wrapper popup-loader">
          <ClientProviders>{children}</ClientProviders>
        </body>
      </html>
    </SessionProvider>
  );
}
