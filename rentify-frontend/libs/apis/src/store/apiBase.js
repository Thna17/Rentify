export const RENTIFY_API_BASE = __API_URL__;

export const ECOMMERCE_API_BASE = __ECOMMERCE_API_;

export const ECOMMERCE_API_ROOT = ECOMMERCE_API_BASE.replace(/\/ecommerce\/?$/, "");

export const ECOMMERCE_STATS_BASE = ECOMMERCE_API_BASE.includes("/ecommerce")
  ? ECOMMERCE_API_BASE
  : `${ECOMMERCE_API_BASE}/ecommerce`;
