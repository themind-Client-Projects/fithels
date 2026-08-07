import Footer1 from "@/components/footers/Footer1";
import Header1 from "@/components/headers/Header1";
import Topbar from "@/components/headers/Topbar";
import OrderTracking from "@/components/my-account/OrderTracking";

import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "myOrders" });
  return {
    title: `${t("orderTracking")} | Fit Women Heels`,
    description: t("orderTracking"),
  };
}

export default async function OrderDetailPage({ params }) {
  const { id } = await params;
  const t = await getTranslations("myOrders");

  return (
    <>
      <Topbar />
      <Header1 />
      <div className="tf-page-title">
        <div className="container-full">
          <div className="heading text-center">{t("orderTracking")}</div>
        </div>
      </div>
      <OrderTracking orderId={id} />
      <Footer1 />
    </>
  );
}
