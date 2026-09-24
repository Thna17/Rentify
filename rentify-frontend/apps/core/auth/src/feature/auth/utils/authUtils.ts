// Shared auth-related utilities
import { useLocation } from 'react-router-dom';
import {
  MARKETING_URL,
  MARKETPLACE_URL,
  DASHBOARD_URL,
  ADMIN_DASHBOARD_URL,
  AUTH_URL,
} from '@rentify/shared/config/urls';
import { getSafeReturnUrl, isHostedStorefrontReturn } from './returnUrl';

export const useAuthConfig = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const rawReturnUrl = searchParams.get('returnUrl') || searchParams.get('domain');
  const returnUrl = getSafeReturnUrl(rawReturnUrl);
  const marketingHost = new URL(MARKETING_URL).host;
  const marketplaceHost = new URL(MARKETPLACE_URL).host;
  const dashboardHost = new URL(DASHBOARD_URL).host;
  const adminDashboardHost = ADMIN_DASHBOARD_URL ? new URL(ADMIN_DASHBOARD_URL).host : '';
  const authHost = new URL(AUTH_URL).host;
  const returnDomain = new URL(returnUrl).host;
  const isHostedStorefrontBuyer = isHostedStorefrontReturn(returnUrl);

  return {
    returnDomain,
    redirectUrl: returnUrl,
    hasExplicitReturnUrl: Boolean(rawReturnUrl),
    adminDashboardHost,
    isMarketplace: returnDomain === marketplaceHost,
    isAdminDashboard: Boolean(adminDashboardHost && returnDomain === adminDashboardHost),
    isHostedStorefrontBuyer,
    isWebsiteTemplate:
      returnDomain !== marketingHost &&
      returnDomain !== marketplaceHost &&
      returnDomain !== dashboardHost &&
      returnDomain !== adminDashboardHost &&
      returnDomain !== authHost &&
      !isHostedStorefrontBuyer,
  };
};

export const getMutationHandler = (
  isWebsiteTemplate: boolean,
  websiteId: string | undefined
) => ({
  signup: isWebsiteTemplate ? 'customer' : 'default',
  login: isWebsiteTemplate ? 'customer' : 'default',
  getStoreId: () => (isWebsiteTemplate ? websiteId : undefined),
});
