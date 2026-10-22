import { Injectable } from '@angular/core';
import { CoreApiClient, CommerceApiClient } from './generated';

declare global {
  interface Window {
    __RENTIFY_ADMIN__?: {
      coreApiUrl?: string;
      commerceApiUrl?: string;
      authUrl?: string;
      adminUrl?: string;
      marketplaceUrl?: string;
      merchantDashboardUrl?: string;
    };
  }
}

const isLocal = () =>
  typeof window !== 'undefined' &&
  (window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1');

const getBaseUrl = (override: string | undefined, fallback: string) =>
  (override || (isLocal() ? fallback : '')).replace(/\/+$/, '');

export const resolveAdminApiConfig = (): { coreBaseUrl: string; commerceBaseUrl: string } => {
  const runtime = typeof window !== 'undefined' ? window.__RENTIFY_ADMIN__ : undefined;
  return {
    coreBaseUrl: getBaseUrl(runtime?.coreApiUrl, 'http://localhost:3001'),
    commerceBaseUrl: getBaseUrl(runtime?.commerceApiUrl, 'http://localhost:4001'),
  };
};

@Injectable({ providedIn: 'root' })
export class PlatformApiService {
  readonly core: CoreApiClient;
  readonly commerce: CommerceApiClient;

  constructor() {
    const config = resolveAdminApiConfig();
    this.core = new CoreApiClient({
      baseUrl: config.coreBaseUrl,
      credentials: 'include',
    });
    this.commerce = new CommerceApiClient({
      baseUrl: config.commerceBaseUrl,
      credentials: 'include',
    });
  }
}
