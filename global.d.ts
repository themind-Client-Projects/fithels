type Messages = {
  site: typeof import('./messages/en/site.json');
  nav: typeof import('./messages/en/nav.json');
  common: typeof import('./messages/en/common.json');
  shop: typeof import('./messages/en/shop.json');
  checkout: typeof import('./messages/en/checkout.json');
  myOrders: typeof import('./messages/en/myOrders.json');
  status: typeof import('./messages/en/status.json');
  Dashboard: typeof import('./messages/en/Dashboard.json');
  // These three are loaded by i18n.ts but were missing here, so keys in them
  // had no type coverage — a renamed or deleted key raised no compile error.
  home: typeof import('./messages/en/home.json');
  about: typeof import('./messages/en/about.json');
  contact: typeof import('./messages/en/contact.json');
};

declare interface IntlMessages extends Messages {}
