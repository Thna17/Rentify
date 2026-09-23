/** Stable, template-safe contract for all Rentify storefronts. */
export type ThemeTokens = Record<string, string | number>;

export interface StorefrontWebsite {
  id: string;
  domain?: string;
  name?: string;
  niche: string;
  status: 'active' | 'inactive' | 'suspended' | 'maintenance';
  theme?: ThemeTokens;
}

export interface StorefrontProduct {
  id: string;
  websiteId: string;
  name: string;
  slug: string;
  price: number;
  status: string;
}

export interface StorefrontCartLine {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface StorefrontCustomerSession {
  customerId: string;
  websiteId: string;
  expiresAt?: string;
}

export type StorefrontAnalyticsEvent =
  | { name: 'store_view'; websiteId: string }
  | { name: 'product_view'; websiteId: string; productId: string }
  | { name: 'add_to_cart'; websiteId: string; productId: string; quantity: number }
  | { name: 'checkout_started'; websiteId: string }
  | { name: 'order_completed'; websiteId: string; orderId: string };
