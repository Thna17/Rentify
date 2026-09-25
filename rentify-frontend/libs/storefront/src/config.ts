import { AUTH_URL } from '@rentify/shared/config/urls';

/**
 * Customer sign-in is hosted by the Rentify auth app. It resolves the store
 * from `returnUrl`, signs the shopper in as a customer of that store and sends
 * them back. Returns null when no auth URL is configured for this build.
 */
export const customerSignInUrl = (returnUrl: string): string | null => {
  if (!AUTH_URL) return null;
  return `${AUTH_URL}?returnUrl=${encodeURIComponent(returnUrl)}`;
};
