export const RENTIFY_API_BASE = __API_URL__;

export const ECOMMERCE_API_BASE = __ECOMMERCE_API_;

export const ECOMMERCE_API_ROOT = ECOMMERCE_API_BASE.replace(
  /\/ecommerce\/?$/,
  ''
);

export const ECOMMERCE_STATS_BASE = ECOMMERCE_API_BASE.includes('/ecommerce')
  ? ECOMMERCE_API_BASE
  : `${ECOMMERCE_API_BASE}/ecommerce`;

export const DASHBOARD_URL = __DASHBOARD__URL__;

export const AUTH_URL = __AUTH__URL__;

export const MARKETING_URL = __MARKETING_URL__;

export const STOREFRONT_ORIGIN = __STOREFRONT_ORIGIN__;
/// <reference path="./vite-globals.d.ts" />
