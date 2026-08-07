import { redirect } from "next/navigation";
import { routing } from "@/i18n/routing";

/**
 * The unlocalised `/` route.
 *
 * In practice the next-intl middleware already rewrites `/` to `/<defaultLocale>`
 * before this ever renders. It still has to exist as a valid page though: the
 * previous version rendered the full storefront here, and because this segment
 * sits outside `app/[locale]` there is no `NextIntlClientProvider` above it — so
 * every `useTranslations()` call inside those components threw and the
 * production build failed while prerendering `/`.
 *
 * Redirecting keeps the observable behaviour identical and lets the build pass.
 */
export default function RootPage() {
  redirect(`/${routing.defaultLocale}`);
}
