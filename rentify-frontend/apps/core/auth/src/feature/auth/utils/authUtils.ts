// Shared auth-related utilities
import { useLocation } from 'react-router-dom';
import {
  MARKETING_URL,
  MARKETPLACE_URL,
  DASHBOARD_URL,
  ADMIN_DASHBOARD_URL,
  AUTH_URL,
  POS_URL,
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
  const posHost = POS_URL ? new URL(POS_URL).host : '';
  const returnDomain = new URL(returnUrl, typeof window !== 'undefined' ? window.location.origin : undefined).host;
  const isHostedStorefrontBuyer = isHostedStorefrontReturn(returnUrl);

  return {
    returnDomain,
    redirectUrl: returnUrl,
    hasExplicitReturnUrl: Boolean(rawReturnUrl),
    adminDashboardHost,
    isMarketplace: returnDomain === marketplaceHost,
    isAdminDashboard: Boolean(adminDashboardHost && returnDomain === adminDashboardHost),
    isPOS: Boolean(posHost && returnDomain === posHost),
    isHostedStorefrontBuyer,
    isWebsiteTemplate:
      returnDomain !== marketingHost &&
      returnDomain !== marketplaceHost &&
      returnDomain !== dashboardHost &&
      returnDomain !== adminDashboardHost &&
      returnDomain !== authHost &&
      returnDomain !== posHost &&
      !isHostedStorefrontBuyer,
  };
};

export interface ResolveDestinationOptions {
  hasStore?: boolean;
  isStaff?: boolean;
  role?: string;
  config: ReturnType<typeof useAuthConfig>;
}

export const resolveAuthDestination = ({
  hasStore = false,
  isStaff = false,
  role = 'user',
  config,
}: ResolveDestinationOptions): string => {
  const {
    redirectUrl,
    hasExplicitReturnUrl,
    returnDomain,
    adminDashboardHost,
    isMarketplace,
    isPOS,
    isHostedStorefrontBuyer,
    isWebsiteTemplate,
  } = config;

  const marketingHost = new URL(MARKETING_URL).host;
  const dashboardHost = new URL(DASHBOARD_URL).host;
  const marketplaceHost = new URL(MARKETPLACE_URL).host;
  const marketingStartUrl = `${MARKETING_URL.replace(/\/+$/, '')}/start`;

  const isBareMarketingRoot = (() => {
    try {
      const parsed = new URL(redirectUrl);
      return returnDomain === marketingHost && (!parsed.pathname || parsed.pathname === '/');
    } catch {
      return false;
    }
  })();

  if (role === 'admin') {
    if (
      hasExplicitReturnUrl &&
      redirectUrl !== marketingStartUrl &&
      redirectUrl !== MARKETING_URL &&
      !isBareMarketingRoot
    ) {
      return redirectUrl;
    }
    return `${ADMIN_DASHBOARD_URL}/admin/dashboard`;
  }

  // Storefront buyers or marketplace buyers return to the store or marketplace
  if (isWebsiteTemplate || isHostedStorefrontBuyer || isMarketplace || returnDomain === marketplaceHost) {
    return redirectUrl;
  }

  // POS register
  if (isPOS) {
    if (hasStore || isStaff) {
      return redirectUrl;
    }
    return marketingStartUrl;
  }

  // Merchant user with store or staff
  if (hasStore || isStaff) {
    if (
      hasExplicitReturnUrl &&
      !isBareMarketingRoot &&
      returnDomain === dashboardHost
    ) {
      return redirectUrl;
    }
    return `${DASHBOARD_URL}/overview`;
  }

  // Merchant without a store: redirect directly to onboarding
  return marketingStartUrl;
};

const TELEGRAM_WIDGET_SRC = 'https://telegram.org/js/telegram-widget.js?22';

export const loadTelegramWidget = () =>
  new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    if ((window as any).Telegram?.Login) return resolve();
    const existing = document.querySelector('script[src*="telegram-widget.js"]');
    if (existing) {
      if ((window as any).Telegram?.Login) return resolve();
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Could not load Telegram login')));
      return;
    }
    const script = document.createElement('script');
    script.src = TELEGRAM_WIDGET_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Telegram login'));
    document.head.appendChild(script);
  });

export const requestTelegramAuth = async (botId: string) => {
  await loadTelegramWidget();
  return new Promise<Record<string, unknown> | null>((resolve) => {
    (window as any).Telegram.Login.auth(
      { bot_id: botId, request_access: 'write' },
      (data: Record<string, unknown> | false) => resolve(data || null)
    );
  });
};

export const getMutationHandler = (
  isWebsiteTemplate: boolean,
  websiteId: string | undefined
) => ({
  signup: isWebsiteTemplate ? 'customer' : 'default',
  login: isWebsiteTemplate ? 'customer' : 'default',
  getStoreId: () => (isWebsiteTemplate ? websiteId : undefined),
});
