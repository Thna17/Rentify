import { describe, expect, it } from 'vitest';
import { bottomBarVisible } from './MobileBottomBar';

describe('mobile bottom bar visibility', () => {
  it('shows on everyday pages', () => {
    for (const path of ['/', '/overview', '/orders', '/orders/abc', '/products', '/share', '/settings/delivery']) {
      expect(bottomBarVisible(path), path).toBe(true);
    }
  });

  it('gives full-screen tasks the whole screen', () => {
    for (const path of ['/products/create', '/products/edit/abc', '/customization', '/customization/xyz']) {
      expect(bottomBarVisible(path), path).toBe(false);
    }
  });
});
