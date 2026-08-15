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
      {/* data-scroll-behavior: the stylesheet sets `scroll-behavior: smooth`
          globally (public/css/styles.css). Next.js 15 quietly suppressed that
          during route changes so navigation still jumped straight to the top;
          Next.js 16 no longer does unless this attribute is present, which
          would leave every page change slowly gliding up the previous page. */}
      <html lang="ar" dir="rtl" data-scroll-behavior="smooth" suppressHydrationWarning>
        <body className="preload-wrapper popup-loader">
          <ClientProviders>{children}</ClientProviders>
        </body>
      </html>
    </SessionProvider>
  );
}
