import { loadEnv } from 'vite';

export type PublicRuntimeConfig = {
  rentifyApiUrl: string;
  ecommerceApiUrl: string;
  authUrl: string;
  merchantDashboardUrl: string;
  marketingUrl: string;
  marketplaceUrl: string;
  storefrontOrigin: string;
  hostedStorefrontDomain: string;
  hostedStorefrontBuyerEnabled: string;
};

const withoutTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export function getPublicRuntimeConfig(mode: string): PublicRuntimeConfig {
  const env = loadEnv(mode, process.cwd(), '');
  const development = mode === 'development';
  const local = {
    rentifyApiUrl: 'http://localhost:3001',
    ecommerceApiUrl: 'http://localhost:4001',
    authUrl: 'http://localhost:4300',
    merchantDashboardUrl: 'http://localhost:4400',
    marketingUrl: 'http://localhost:4200',
    marketplaceUrl: 'http://localhost:4201',
    storefrontOrigin: 'http://localhost:4700',
  };
  const config = {
    rentifyApiUrl: env.VITE_RENTIFY_API_URL || env.RENTIFY_API_URL || (development ? local.rentifyApiUrl : ''),
    ecommerceApiUrl: env.VITE_ECOMMERCE_API_URL || env.ECOMMERCE_API_URL || (development ? local.ecommerceApiUrl : ''),
    authUrl: env.VITE_AUTH_URL || env.AUTH_URL || (development ? local.authUrl : ''),
    merchantDashboardUrl: env.VITE_MERCHANT_DASHBOARD_URL || env.MERCHANT_DASHBOARD_URL || (development ? local.merchantDashboardUrl : ''),
    marketingUrl: env.VITE_MARKETING_URL || env.MARKETING_URL || (development ? local.marketingUrl : ''),
    marketplaceUrl: env.VITE_MARKETPLACE_URL || env.MARKETPLACE_URL || (development ? local.marketplaceUrl : ''),
    storefrontOrigin: env.VITE_STOREFRONT_ORIGIN || env.STOREFRONT_ORIGIN || (development ? local.storefrontOrigin : ''),
    hostedStorefrontDomain: env.VITE_HOSTED_STOREFRONT_DOMAIN || 'rentifystore.shop',
    hostedStorefrontBuyerEnabled: env.VITE_HOSTED_STOREFRONT_BUYER_ENABLED || 'false',
  };

  for (const [key, value] of Object.entries(config)) {
    if (!value) throw new Error(`Missing required public environment variable for ${key}`);
    if (!development && /localhost|127\.0\.0\.1/.test(value)) {
      throw new Error(`${key} cannot use localhost outside development`);
    }
  }

  return Object.fromEntries(Object.entries(config).map(([key, value]) => [key, withoutTrailingSlash(value)])) as PublicRuntimeConfig;
}

export function vitePublicDefines(mode: string) {
  const config = getPublicRuntimeConfig(mode);
  return {
    __API_URL__: JSON.stringify(config.rentifyApiUrl),
    __ECOMMERCE_API_: JSON.stringify(config.ecommerceApiUrl),
    __AUTH__URL__: JSON.stringify(config.authUrl),
    __DASHBOARD__URL__: JSON.stringify(config.merchantDashboardUrl),
    __MARKETING_URL__: JSON.stringify(config.marketingUrl),
    __MARKETPLACE_URL__: JSON.stringify(config.marketplaceUrl),
    __STOREFRONT_ORIGIN__: JSON.stringify(config.storefrontOrigin),
    __HOSTED_STOREFRONT_DOMAIN__: JSON.stringify(config.hostedStorefrontDomain),
    __HOSTED_STOREFRONT_BUYER_ENABLED__: JSON.stringify(config.hostedStorefrontBuyerEnabled === 'true'),
  };
}
