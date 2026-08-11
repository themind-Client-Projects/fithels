import Footer1 from "@/components/footers/Footer1";
import Header1 from "@/components/headers/Header1";
import Topbar from "@/components/headers/Topbar";
import AccountOverview from "@/components/my-account/AccountOverview";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "myOrders" });
  return {
    title: `${t("accountTitle")} | Fit Women Heels`,
    description: t("accountSubtitle"),
    // Per-customer page — never index it.
    robots: { index: false, follow: false },
  };
}

/**
 * The customer account hub.
 *
 * The header's profile dropdown had linked to /account since the template was
 * imported, but the route never existed — every signed-in customer clicking
 * "My Account" got a 404.
 */
export default async function AccountPage() {
  const t = await getTranslations("myOrders");

  return (
    <>
      <Topbar />
      <Header1 />
      <div className="tf-page-title">
        <div className="container-full">
          <div className="heading text-center">{t("accountTitle")}</div>
          <p className="text-center text-secondary" style={{ marginTop: "8px" }}>
            {t("accountSubtitle")}
          </p>
        </div>
      </div>
      <AccountOverview />
      <Footer1 />
    </>
  );
}
