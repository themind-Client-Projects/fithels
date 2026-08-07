import Footer1 from "@/components/footers/Footer1";
import Header1 from "@/components/headers/Header1";
import Topbar from "@/components/headers/Topbar";
import MyOrdersList from "@/components/my-account/MyOrdersList";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "myOrders" });
  return {
    title: `${t("title")} | Fit Women Heels`,
    description: t.has("description") ? t("description") : "Track your orders",
  };
}

export default async function MyOrdersPage() {
  const t = await getTranslations("myOrders");
  return (
    <>
      <Topbar />
      <Header1 />
      <div className="tf-page-title">
        <div className="container-full">
          <div className="heading text-center">{t("title")}</div>
        </div>
      </div>
      <MyOrdersList />
      <Footer1 />
    </>
  );
}
