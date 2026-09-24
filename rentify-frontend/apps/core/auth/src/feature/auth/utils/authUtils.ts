// Shared auth-related utilities
import { useLocation } from 'react-router-dom';
import { MARKETING_URL, MARKETPLACE_URL } from '@rentify/shared/config/urls';
import { getSafeReturnUrl } from './returnUrl';

export const useAuthConfig = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const returnUrl = getSafeReturnUrl(
    searchParams.get('returnUrl') || searchParams.get('domain')
  );
  const marketingHost = new URL(MARKETING_URL).host;
  const marketplaceHost = new URL(MARKETPLACE_URL).host;
  const returnDomain = new URL(returnUrl).host;

  return {
    returnDomain,
    redirectUrl: returnUrl,
    isMarketplace: returnDomain === marketplaceHost,
    isWebsiteTemplate: returnDomain !== marketingHost && returnDomain !== marketplaceHost,
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
