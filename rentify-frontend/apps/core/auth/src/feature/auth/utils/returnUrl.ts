import {
  AUTH_URL,
  DASHBOARD_URL,
  MARKETING_URL,
  MARKETPLACE_URL,
  STOREFRONT_ORIGIN,
  HOSTED_STOREFRONT_BUYER_ENABLED,
  HOSTED_STOREFRONT_DOMAIN,
} from '@rentify/shared/config/urls';

const allowedOrigins = () =>
  new Set(
    [AUTH_URL, MARKETING_URL, MARKETPLACE_URL, DASHBOARD_URL, STOREFRONT_ORIGIN].map(
      (url) => new URL(url).origin
    )
  );

export const getSafeReturnUrl = (
  candidate: string | null | undefined,
  fallback = MARKETING_URL
) => {
  if (!candidate) return fallback;
  try {
    const parsed = new URL(candidate);
    const hosted = HOSTED_STOREFRONT_BUYER_ENABLED && parsed.protocol === 'https:' &&
      parsed.port === '' && !parsed.username && !parsed.password &&
      parsed.hostname.endsWith(`.${HOSTED_STOREFRONT_DOMAIN}`) &&
      /^[a-z0-9-]+$/.test(parsed.hostname.slice(0, -(HOSTED_STOREFRONT_DOMAIN.length + 1)));
    return allowedOrigins().has(parsed.origin) || hosted ? parsed.toString() : fallback;
  } catch {
    return fallback;
  }
};

export const isHostedStorefrontReturn = (url: string) => {
  const parsed = new URL(url);
  if (HOSTED_STOREFRONT_BUYER_ENABLED && HOSTED_STOREFRONT_DOMAIN === 'localhost' &&
      parsed.origin === new URL(STOREFRONT_ORIGIN).origin) return true;
  return HOSTED_STOREFRONT_BUYER_ENABLED && parsed.protocol === 'https:' && parsed.port === '' &&
    !parsed.username && !parsed.password &&
    parsed.hostname.endsWith(`.${HOSTED_STOREFRONT_DOMAIN}`) &&
    /^[a-z0-9-]+$/.test(parsed.hostname.slice(0, -(HOSTED_STOREFRONT_DOMAIN.length + 1)));
};
