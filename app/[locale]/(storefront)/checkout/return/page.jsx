import { Suspense } from "react";
import Footer1 from "@/components/footers/Footer1";
import Header1 from "@/components/headers/Header1";
import Topbar from "@/components/headers/Topbar";
import PaymentReturn from "@/components/otherPages/PaymentReturn";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkout" });
  return {
    title: `${t("orderConfirmation")} | Fit Women Heels`,
    description: t("orderConfirmation"),
    // Never index a post-payment landing page.
    robots: { index: false, follow: false },
  };
}

/**
 * Where Wayle sends the payer after checkout (`redirectionUrl`).
 *
 * Wayle appends ?referenceId=...&orderid=... to this URL. The client component
 * reads the reference, strips it from the address bar, and polls for the
 * webhook to land.
 */
export default async function CheckoutReturnPage() {
  const tCheckout = await getTranslations("checkout");

  return (
    <>
      <Topbar />
      <Header1 />
      <div
        className="page-title"
        style={{ backgroundImage: "url(/images/section/page-title.jpg)" }}
      >
        <div className="container">
          <h3 className="heading text-center">{tCheckout("orderConfirmation")}</h3>
        </div>
      </div>
      {/* useSearchParams needs a Suspense boundary during prerender. */}
      <Suspense fallback={null}>
        <PaymentReturn />
      </Suspense>
      <Footer1 />
    </>
  );
}
