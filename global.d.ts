type Messages = {
  site: typeof import('./messages/en/site.json');
  nav: typeof import('./messages/en/nav.json');
  common: typeof import('./messages/en/common.json');
  shop: typeof import('./messages/en/shop.json');
  checkout: typeof import('./messages/en/checkout.json');
  myOrders: typeof import('./messages/en/myOrders.json');
  status: typeof import('./messages/en/status.json');
  Dashboard: typeof import('./messages/en/Dashboard.json');
};

declare interface IntlMessages extends Messages {}
