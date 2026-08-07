import { getRequestConfig } from 'next-intl/server';
import { routing } from '@/i18n/routing';

export const locales = routing.locales;
export const defaultLocale = routing.defaultLocale;

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) || defaultLocale;

  return {
    locale,
    messages: {
      site: (await import(`./messages/${locale}/site.json`)).default,
      nav: (await import(`./messages/${locale}/nav.json`)).default,
      common: (await import(`./messages/${locale}/common.json`)).default,
      shop: (await import(`./messages/${locale}/shop.json`)).default,
      checkout: (await import(`./messages/${locale}/checkout.json`)).default,
      myOrders: (await import(`./messages/${locale}/myOrders.json`)).default,
      status: (await import(`./messages/${locale}/status.json`)).default,
      Dashboard: (await import(`./messages/${locale}/Dashboard.json`)).default,
      home: (await import(`./messages/${locale}/home.json`)).default,
      about: (await import(`./messages/${locale}/about.json`)).default,
      contact: (await import(`./messages/${locale}/contact.json`)).default,
    }
  };
});
