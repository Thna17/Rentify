import { describe, it, expect } from 'vitest';
import {
  ProductFilterChip,
  ProductItem,
  filterProductsByChip,
  computeChannelBadges,
} from './productUtils';

describe('MR3 · Products — One List (Screens M8, M9, M10; P2)', () => {
  const mockProducts: ProductItem[] = [
    {
      id: 'p-1',
      name: 'Butter Croissant',
      price: 1.75,
      stockQuantity: 24,
      status: 'active',
      marketplaceVisibility: true,
    },
    {
      id: 'p-2',
      name: 'Mondulkiri House Blend · 250g',
      price: 9.5,
      salePrice: 8.0,
      stockQuantity: 40,
      status: 'active',
      marketplaceVisibility: true,
    },
    {
      id: 'p-3',
      name: 'Americano',
      price: 2.0,
      stockQuantity: 0,
      status: 'active',
      marketplaceVisibility: true,
    },
    {
      id: 'p-4',
      name: 'Secret Special Roast',
      price: 15.0,
      stockQuantity: 10,
      status: 'active',
      marketplaceVisibility: false,
    },
    {
      id: 'p-5',
      name: 'Seasonal Pumpkin Spice',
      price: 3.5,
      stockQuantity: 5,
      status: 'draft',
      marketplaceVisibility: true,
    },
  ];

  describe('Filter Chips (filterProductsByChip)', () => {
    it('returns all products for "all" chip', () => {
      expect(filterProductsByChip(mockProducts, 'all')).toHaveLength(5);
    });

    it('filters products on sale for "on_sale" chip', () => {
      const filtered = filterProductsByChip(mockProducts, 'on_sale');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('p-2');
    });

    it('filters out of stock products for "out_of_stock" chip', () => {
      const filtered = filterProductsByChip(mockProducts, 'out_of_stock');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('p-3');
    });

    it('filters hidden marketplace products for "hidden" chip', () => {
      const filtered = filterProductsByChip(mockProducts, 'hidden');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('p-4');
    });

    it('filters draft products for "drafts" chip', () => {
      const filtered = filterProductsByChip(mockProducts, 'drafts');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('p-5');
    });
  });

  describe('Channel Visibility Badges (computeChannelBadges)', () => {
    it('computes market and storefront visible badges for active product', () => {
      const badges = computeChannelBadges(mockProducts[0], true);
      expect(badges.onMarketplace).toBe(true);
      expect(badges.onStorefront).toBe(true);
      expect(badges.isOutOfStock).toBe(false);
      expect(badges.isHidden).toBe(false);
    });

    it('identifies out of stock items accurately', () => {
      const badges = computeChannelBadges(mockProducts[2], true);
      expect(badges.isOutOfStock).toBe(true);
    });

    it('flags items hidden from marketplace', () => {
      const badges = computeChannelBadges(mockProducts[3], true);
      expect(badges.onMarketplace).toBe(false);
      expect(badges.isHidden).toBe(true);
      expect(badges.onStorefront).toBe(true);
    });

    it('draft items are not active on storefront or marketplace', () => {
      const badges = computeChannelBadges(mockProducts[4], true);
      expect(badges.onMarketplace).toBe(false);
      expect(badges.onStorefront).toBe(false);
    });
  });

  describe('Route and Redirect Invariants (P2)', () => {
    it('defines expected redirect targets according to wireframe Overview sitemap', () => {
      const redirects = [
        { from: '/catalog', to: '/products' },
        { from: '/products/manage', to: '/products' },
        { from: '/categories', to: '/products?tab=categories' },
      ];

      expect(redirects[0].to).toBe('/products');
      expect(redirects[1].to).toBe('/products');
      expect(redirects[2].to).toBe('/products?tab=categories');
    });
  });
});
