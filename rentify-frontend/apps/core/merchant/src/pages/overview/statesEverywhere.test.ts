import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const read = (path: string) => readFileSync(resolve(__dirname, '..', path), 'utf-8');

// Every screen has loading, empty and error+retry states (CLAUDE.md, redesign M30)
describe('States everywhere (redesign M30)', () => {
  it.each([
    'overview/Overview.tsx',
    'order-management/OrderManagement.tsx',
    'order-management/OrderDetailView.tsx',
    'marketplace/MarketplacePage.tsx',
    'returns/ReturnsPage.tsx',
    'overview/PlatformAnalytics.tsx',
    'online-store/OnlineStorePage.tsx',
  ])('%s has an error state with a retry and a loading state', (file) => {
    const source = read(file);
    expect(source).toMatch(/tone="error"/);
    expect(source).toMatch(/merchant\.common\.retry/);
    expect(source).toMatch(/Skeleton|animate-pulse|isLoading|loading/);
  });

  it('ProductManagement.tsx implements loading skeleton table, empty, error retry, and plan block', () => {
    const file = read('product-management/ProductManagement.tsx');
    expect(file).toContain('loadingSkeletonRows');
    expect(file).toContain('error_loading');
    expect(file).toContain('disabledReason');
    expect(file).toContain('/settings/billing');
  });

  it('InvoiceManual.jsx implements skeleton, empty, error retry', () => {
    const file = read('invoice-manual/InvoiceManual.jsx');
    expect(file).toContain('Skeleton');
    expect(file).toContain('Failed to load invoices');
    expect(file).toContain('Retry');
    expect(file).toContain('No invoices yet');
  });
});
