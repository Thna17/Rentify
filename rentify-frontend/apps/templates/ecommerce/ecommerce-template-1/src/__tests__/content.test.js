import { describe, expect, test } from 'vitest';
import { getStoreIdentity, safeUrl } from '@rentify/storefront/content';
import { translate } from '../i18n';

describe('store identity', () => {
  test('reads both plain-string and { text } content values', () => {
    const identity = getStoreIdentity([
      { category: 'global setting', label: 'Website Name', type: 'text', value: 'Aura Botanicals' },
      { category: 'Hero', label: 'Hero Headline', type: 'text', value: { text: 'Glow naturally' } },
      { category: 'homepage', label: 'Hero Image', type: 'image[]', value: ['https://cdn.example.com/1.jpg', { url: 'javascript:alert(1)' }] },
      { category: 'global setting', label: 'Social Media', value: { facebook: 'https://facebook.com/aura', instagram: 'javascript:alert(1)' } },
    ]);
    expect(identity.name).toBe('Aura Botanicals');
    expect(identity.heroHeadline).toBe('Glow naturally');
    expect(identity.heroImages).toEqual(['https://cdn.example.com/1.jpg']);
    expect(identity.socialLinks).toEqual([{ network: 'facebook', url: 'https://facebook.com/aura' }]);
  });

  test('reads the header style and falls back to heritage for unknown values', () => {
    expect(getStoreIdentity([{ label: 'Header Style', value: { text: 'Riverside' } }]).headerStyle).toBe('riverside');
    expect(getStoreIdentity([{ label: 'Header Style', value: 'neon' }]).headerStyle).toBe('heritage');
    expect(getStoreIdentity([]).headerStyle).toBe('heritage');
  });

  test('does not invent contact details the merchant has not provided', () => {
    const identity = getStoreIdentity([]);
    expect(identity).toMatchObject({ name: '', phone: '', location: '', email: '', logoUrl: null, heroImages: [] });
  });

  test('only allows http(s) and same-origin URLs', () => {
    expect(safeUrl('https://example.com/a.png')).toBe('https://example.com/a.png');
    expect(safeUrl('/uploads/a.png')).toBe('/uploads/a.png');
    expect(safeUrl('//evil.example.com/a.png')).toBeNull();
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('data:text/html,<script>')).toBeNull();
  });
});

describe('translations', () => {
  test('interpolates parameters in English and Khmer', () => {
    expect(translate('en', 'product.lowStock', { count: 2 })).toBe('Only 2 left');
    expect(translate('kh', 'product.lowStock', { count: 2 })).toBe('នៅសល់តែ 2');
  });

  test('uses English singular forms', () => {
    expect(translate('en', 'catalog.count', { count: 1 })).toBe('1 product');
    expect(translate('en', 'catalog.count', { count: 3 })).toBe('3 products');
    expect(translate('kh', 'catalog.count', { count: 1 })).toBe('ទំនិញ 1');
  });

  test('falls back to a provided default for unknown statuses', () => {
    expect(translate('en', 'order.statuses.on_hold', { defaultValue: 'on_hold' })).toBe('on_hold');
  });
});
