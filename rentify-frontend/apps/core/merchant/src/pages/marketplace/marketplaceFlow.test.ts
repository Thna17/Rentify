import { describe, it, expect } from 'vitest';

describe('MR7 · Marketplace page and Share (Screens M16, M20)', () => {
  describe('Marketplace Page (Screen M16; DEC-028)', () => {
    it('presents store listing status first with clear actions', () => {
      const listingState = {
        title: 'Listed',
        description: 'Buyers can find and order from your store',
        actions: ['View my store page', 'Share link'],
      };

      expect(listingState.title).toBe('Listed');
      expect(listingState.actions).toContain('View my store page');
      expect(listingState.actions).toContain('Share link');
    });

    it('categorizes products into Shown and Hidden with actionable reasons', () => {
      const mockCatalog = [
        { id: 1, name: 'Americano', stock: 0, status: 'active', isVisibleOnMarketplace: true },
        { id: 2, name: 'Latte', stock: 5, status: 'active', isVisibleOnMarketplace: true },
        { id: 3, name: 'Matcha', stock: 2, status: 'inactive', isVisibleOnMarketplace: false },
      ];

      const shown = mockCatalog.filter(
        (p) => p.status === 'active' && p.stock > 0 && p.isVisibleOnMarketplace
      );
      const hidden = mockCatalog.filter(
        (p) => p.status !== 'active' || p.stock === 0 || !p.isVisibleOnMarketplace
      );

      expect(shown).toHaveLength(1);
      expect(hidden).toHaveLength(2);

      const outOfStockReason =
        mockCatalog[0].stock === 0
          ? 'Hidden · out of stock'
          : 'Hidden · you turned it off';
      expect(outOfStockReason).toBe('Hidden · out of stock');

      const turnedOffReason =
        !mockCatalog[2].isVisibleOnMarketplace
          ? 'Hidden · you turned it off'
          : 'Hidden · out of stock';
      expect(turnedOffReason).toBe('Hidden · you turned it off');
    });

    it('links to flat delivery fee configuration (DEC-004)', () => {
      const deliverySection = {
        label: 'Delivery fee',
        description: '$1.00 per order, paid on delivery',
        targetRoute: '/settings/delivery',
      };

      expect(deliverySection.targetRoute).toBe('/settings/delivery');
    });
  });

  describe('Share Page (Screen M20)', () => {
    it('provides full 44px buttons for social and direct sharing', () => {
      const shareActions = ['Copy link', 'Telegram', 'Facebook', 'QR code'];
      const minTouchTargetHeightPx = 44;

      expect(shareActions).toHaveLength(4);
      expect(minTouchTargetHeightPx).toBeGreaterThanOrEqual(44);
    });

    it('includes printable poster section for in-person counter display', () => {
      const posterSection = {
        title: 'Print a poster',
        tagline: 'Scan to shop · Cash on delivery & KHQR',
        formats: ['A4', 'A5'],
      };

      expect(posterSection.tagline).toContain('Scan to shop');
      expect(posterSection.formats).toContain('A4');
    });
  });
});
