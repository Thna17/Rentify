import { HOSTED_STOREFRONT_BUYER_ENABLED, HOSTED_STOREFRONT_DOMAIN,
  AUTH_URL, ECOMMERCE_API_ROOT } from '@rentify/shared/config/urls';

export const isHostedStorefrontBuyer = () => {
  if (!HOSTED_STOREFRONT_BUYER_ENABLED || typeof window === 'undefined') return false;
  const hostname = window.location.hostname.toLowerCase();
  const domain = HOSTED_STOREFRONT_DOMAIN.toLowerCase();
  return domain === 'localhost' ? hostname === domain && window.location.port !== '4300'
    : hostname.endsWith(`.${domain}`) &&
      /^[a-z0-9-]+$/.test(hostname.slice(0, -(domain.length + 1)));
};

export const hostedCheckoutUrl = (websiteId, suffix) =>
  `${ECOMMERCE_API_ROOT}/api/storefront/${encodeURIComponent(websiteId)}${suffix}`;

export const hostedSignInUrl = () =>
  `${AUTH_URL}/login?returnUrl=${encodeURIComponent(window.location.href)}`;

export const hostedRequest = async (url, options = {}) => {
  const response = await fetch(url, { credentials: 'include', ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers } });
  if (response.status === 401) {
    window.location.assign(hostedSignInUrl());
    throw new Error('Please sign in to continue');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
};
