import { describe, expect, test } from 'vitest';
import {
  clampQuantity,
  findVariant,
  formatMoney,
  getApiErrorMessage,
  getCartTotals,
  getProductImages,
  getStockState,
  toAmount,
} from '@rentify/storefront/commerce';

describe('money', () => {
  test('parses DECIMAL strings from the API and formats USD', () => {
    expect(toAmount('12.50')).toBe(12.5);
    expect(toAmount('not a number')).toBe(0);
    expect(formatMoney('12.5')).toBe('$12.50');
  });
});

describe('stock state', () => {
  test('tracked stock limits the purchasable quantity', () => {
    expect(getStockState({ trackInventory: true, stockQuantity: 4, lowStockThreshold: 5 })).toEqual({
      purchasable: true,
      maxQuantity: 4,
      lowStock: true,
      available: 4,
    });
  });

  test('zero tracked stock is not purchasable', () => {
    expect(getStockState({ trackInventory: true, stockQuantity: 0 }).purchasable).toBe(false);
  });

  test('untracked stock and backorders are purchasable without a stock count', () => {
    expect(getStockState({ trackInventory: false, stockQuantity: 0 })).toMatchObject({ purchasable: true, available: null, lowStock: false });
    expect(getStockState({ trackInventory: true, allowBackorders: true, stockQuantity: 0 }).purchasable).toBe(true);
  });

  test('low stock is only reported when the merchant set a threshold', () => {
    expect(getStockState({ trackInventory: true, stockQuantity: 2, lowStockThreshold: 0 }).lowStock).toBe(false);
  });

  test('unpublished products and disabled variants cannot be bought', () => {
    expect(getStockState({ status: 'draft', trackInventory: false }).purchasable).toBe(false);
    expect(getStockState({ status: 'disabled', trackInventory: false }).purchasable).toBe(false);
  });

  test('variants inherit backorders and threshold from the parent product', () => {
    const product = { allowBackorders: false, lowStockThreshold: 3 };
    expect(getStockState({ trackInventory: true, stockQuantity: 2 }, product)).toMatchObject({ lowStock: true, maxQuantity: 2 });
  });
});

describe('quantity validation', () => {
  test('clamps to the allowed range', () => {
    expect(clampQuantity(0, 5)).toBe(1);
    expect(clampQuantity(-3, 5)).toBe(1);
    expect(clampQuantity('abc', 5)).toBe(1);
    expect(clampQuantity(2.7, 5)).toBe(2);
    expect(clampQuantity(50, 5)).toBe(5);
  });

  test('returns 0 when nothing can be purchased', () => {
    expect(clampQuantity(3, 0)).toBe(0);
  });
});

describe('cart totals', () => {
  test('sums server unit prices, including DECIMAL strings', () => {
    const lines = [
      { id: 'a', quantity: 2, unitPrice: '12.50', Product: { price: '99.00' } },
      { id: 'b', quantity: 1, unitPrice: null, Product: { price: '3.25' } },
    ];
    expect(getCartTotals(lines)).toEqual({ itemCount: 3, lineCount: 2, subtotal: 28.25 });
  });

  test('an empty or missing cart totals to zero', () => {
    expect(getCartTotals([])).toEqual({ itemCount: 0, lineCount: 0, subtotal: 0 });
    expect(getCartTotals(undefined)).toEqual({ itemCount: 0, lineCount: 0, subtotal: 0 });
  });
});

describe('product data', () => {
  test('keeps only safe image URLs and falls back to the product name for alt text', () => {
    const images = getProductImages(
      { images: [{ url: 'https://cdn.example.com/a.jpg' }, { url: 'javascript:alert(1)' }, { url: '/uploads/b.jpg', alt: 'Back' }] },
      'Kampot pepper'
    );
    expect(images).toEqual([
      { url: 'https://cdn.example.com/a.jpg', alt: 'Kampot pepper' },
      { url: '/uploads/b.jpg', alt: 'Back' },
    ]);
  });

  test('finds the variant matching every selected option', () => {
    const variants = [
      { id: 'v1', status: 'active', optionValues: { Size: 'S', Color: 'Red' } },
      { id: 'v2', status: 'active', optionValues: { Size: 'M', Color: 'Red' } },
      { id: 'v3', status: 'disabled', optionValues: { Size: 'L', Color: 'Red' } },
    ];
    expect(findVariant(variants, { Size: 'M', Color: 'Red' })?.id).toBe('v2');
    expect(findVariant(variants, { Size: 'L', Color: 'Red' })).toBeNull();
  });
});

test('reads both API error shapes', () => {
  expect(getApiErrorMessage({ data: { error: 'Insufficient stock' } }, 'fallback')).toBe('Insufficient stock');
  expect(getApiErrorMessage({ data: { error: { message: 'Maximum quantity is 10' } } }, 'fallback')).toBe('Maximum quantity is 10');
  expect(getApiErrorMessage({ status: 'FETCH_ERROR' }, 'fallback')).toBe('fallback');
});
