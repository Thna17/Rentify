import {
  AUTH_URL,
  DASHBOARD_URL,
  MARKETING_URL,
  MARKETPLACE_URL,
  STOREFRONT_ORIGIN,
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
    return allowedOrigins().has(parsed.origin) ? parsed.toString() : fallback;
  } catch {
    return fallback;
  }
};
