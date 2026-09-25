/// <reference path="./vite-globals.d.ts" />

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

export const MARKETPLACE_URL = __MARKETPLACE_URL__;

export const ADMIN_DASHBOARD_URL = typeof __ADMIN_DASHBOARD_URL__ !== 'undefined'
  ? __ADMIN_DASHBOARD_URL__
  : 'http://localhost:4800';

export const STOREFRONT_ORIGIN = __STOREFRONT_ORIGIN__;
export const HOSTED_STOREFRONT_DOMAIN = __HOSTED_STOREFRONT_DOMAIN__;
export const HOSTED_STOREFRONT_BUYER_ENABLED = __HOSTED_STOREFRONT_BUYER_ENABLED__;
