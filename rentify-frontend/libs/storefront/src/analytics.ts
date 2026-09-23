import type { StorefrontAnalyticsEvent } from './contract';

/** Emits a browser event so templates can add analytics without importing dashboard code. */
export const trackStorefrontEvent = (event: StorefrontAnalyticsEvent) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('rentify:storefront-analytics', { detail: event }));
  }
};
