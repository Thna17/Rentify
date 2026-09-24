export {};

declare global {
  interface Window {
    __RENTIFY_MARKETPLACE__?: {
      enabled?: boolean;
      cutoverEnabled?: boolean;
      coreApiUrl?: string;
      commerceApiUrl?: string;
      authUrl?: string;
      merchantDashboardUrl?: string;
    };
  }
}
