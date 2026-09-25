/**
 * Pure catalog and cart helpers shared by storefront templates.
 *
 * The e-commerce API serializes DECIMAL columns (price, unitPrice, amounts) as
 * strings and stock fields may be missing, so every helper normalizes input
 * defensively. No helper invents data: stock and pricing come only from the
 * product, variant or cart line returned by the API.
 */
import { safeUrl } from './content';

type UnknownRecord = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Hard ceiling mirrored from the API's cart item validation (max 999). */
export const MAX_LINE_QUANTITY = 999;

export const toAmount = (value: unknown): number => {
  const amount = typeof value === 'string' ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

export const formatMoney = (value: unknown, currency = 'USD', locale = 'en-US'): string => {
  const amount = toAmount(value);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: currency === 'KHR' ? 0 : 2,
      maximumFractionDigits: currency === 'KHR' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
};

export interface ProductImage {
  url: string;
  alt: string;
}

/** Safe image list for a product or variant, with alt text falling back to the name. */
export const getProductImages = (item: UnknownRecord | null | undefined, fallbackAlt = ''): ProductImage[] => {
  const images = Array.isArray(item?.images) ? item.images : [];
  return images
    .map((image: unknown) => {
      const record = typeof image === 'string' ? { url: image } : (image as UnknownRecord) || {};
      const url = safeUrl(record.url);
      if (!url) return null;
      const alt = typeof record.alt === 'string' && record.alt.trim() ? record.alt.trim() : fallbackAlt;
      return { url, alt };
    })
    .filter((image: ProductImage | null): image is ProductImage => Boolean(image));
};

export interface StockState {
  /** Whether the item can be added to the cart at all. */
  purchasable: boolean;
  /** Highest quantity a shopper may select for one cart line. */
  maxQuantity: number;
  /** Whether stock is tracked and at or below the merchant's low-stock threshold. */
  lowStock: boolean;
  /** Units left when stock is tracked and not backordered, otherwise null. */
  available: number | null;
}

/**
 * Stock state for a product or selected variant. Variants fall back to the
 * parent product for fields they do not carry (backorders, threshold).
 */
export const getStockState = (
  item: UnknownRecord | null | undefined,
  parent?: UnknownRecord | null
): StockState => {
  if (!item) return { purchasable: false, maxQuantity: 0, lowStock: false, available: null };

  const status = String(parent?.status ?? item.status ?? 'active');
  if (['draft', 'archived', 'inactive', 'disabled'].includes(status)) {
    return { purchasable: false, maxQuantity: 0, lowStock: false, available: null };
  }

  const trackInventory = (item.trackInventory ?? parent?.trackInventory ?? true) !== false;
  const allowBackorders = Boolean(item.allowBackorders ?? parent?.allowBackorders ?? false);
  if (!trackInventory || allowBackorders) {
    return { purchasable: true, maxQuantity: MAX_LINE_QUANTITY, lowStock: false, available: null };
  }

  const stock = Math.max(0, Math.floor(toAmount(item.stockQuantity)));
  const threshold = Math.max(0, Math.floor(toAmount(parent?.lowStockThreshold ?? item.lowStockThreshold ?? 0)));
  return {
    purchasable: stock > 0,
    maxQuantity: Math.min(stock, MAX_LINE_QUANTITY),
    lowStock: stock > 0 && threshold > 0 && stock <= threshold,
    available: stock,
  };
};

/** Clamps a requested quantity into [1, max]. Returns 0 when nothing is purchasable. */
export const clampQuantity = (value: unknown, maxQuantity: number): number => {
  if (maxQuantity < 1) return 0;
  const requested = Math.floor(toAmount(value));
  if (requested < 1) return 1;
  return Math.min(requested, maxQuantity);
};

/** Unit price for a cart line: the server-captured unit price wins. */
export const getLineUnitPrice = (line: UnknownRecord): number =>
  toAmount(line?.unitPrice ?? line?.ProductVariant?.price ?? line?.Product?.price);

export const getLineTotal = (line: UnknownRecord): number =>
  Math.round(getLineUnitPrice(line) * Math.max(0, toAmount(line?.quantity)) * 100) / 100;

export interface CartTotals {
  itemCount: number;
  lineCount: number;
  subtotal: number;
}

/**
 * Totals the storefront can state with certainty before an order exists.
 * Delivery fees and taxes are calculated by the API when the order is created,
 * so they are intentionally not estimated here.
 */
export const getCartTotals = (lines: UnknownRecord[] | null | undefined): CartTotals => {
  const items = Array.isArray(lines) ? lines : [];
  const subtotal = items.reduce((sum, line) => sum + getLineTotal(line), 0);
  return {
    itemCount: items.reduce((sum, line) => sum + Math.max(0, Math.floor(toAmount(line?.quantity))), 0),
    lineCount: items.length,
    subtotal: Math.round(subtotal * 100) / 100,
  };
};

/** Best human-readable message from an RTK Query / fetch error. */
export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const record = error as UnknownRecord | null;
  const data = record?.data;
  const candidates = [
    typeof data?.error === 'string' ? data.error : data?.error?.message,
    data?.message,
    typeof data === 'string' && data.length < 200 ? data : undefined,
  ];
  const message = candidates.find((value) => typeof value === 'string' && value.trim());
  return message ? message.trim() : fallback;
};

/** Variant matching the selected option values, if any. */
export const findVariant = (
  variants: UnknownRecord[] | null | undefined,
  selected: Record<string, string>
): UnknownRecord | null => {
  const list = Array.isArray(variants) ? variants.filter((variant) => variant?.status !== 'disabled') : [];
  const keys = Object.keys(selected);
  if (!list.length || !keys.length) return null;
  return (
    list.find((variant) => {
      const values = variant?.optionValues || {};
      return keys.every((key) => String(values[key]) === String(selected[key]));
    }) || null
  );
};
