export {};

declare global {
  interface Window {
    __RENTIFY_MARKETPLACE__?: {
      coreApiUrl?: string;
      commerceApiUrl?: string;
      authUrl?: string;
      merchantDashboardUrl?: string;
      adminDashboardUrl?: string;
    };
  }
}
