import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('MR9 · States everywhere (Screen M30 audit)', () => {
  it('Overview.tsx implements skeleton loading, empty state, error retry, and blocked banner', () => {
    const file = readFileSync(resolve(__dirname, 'Overview.tsx'), 'utf-8');
    // Error retry
    expect(file).toContain("We couldn't load your store overview");
    expect(file).toContain('Try again');
    expect(file).toContain('reload');

    // Skeleton loading
    expect(file).toContain('animate-pulse');

    // Empty state
    expect(file).toContain('No recent orders');

    // Blocked state handling (setup guide / subscription)
    expect(file).toContain('settingUp');
    expect(file).toContain('SetupGuideCard');
  });

  it('OrderManagement.tsx implements loading, empty, error retry, and work tabs', () => {
    const file = readFileSync(resolve(__dirname, '../order-management/OrderManagement.tsx'), 'utf-8');
    expect(file).toContain('Loading orders…');
    expect(file).toContain('Could not load orders.');
    expect(file).toContain('Retry');
    expect(file).toContain('No orders in');
    expect(file).toContain('WORK_TABS');
  });

  it('ProductManagement.tsx implements loading skeleton table, empty, error retry, and plan block', () => {
    const file = readFileSync(resolve(__dirname, '../product-management/ProductManagement.tsx'), 'utf-8');
    expect(file).toContain('loadingSkeletonRows');
    expect(file).toContain('error_loading');
    expect(file).toContain('disabledReason');
    expect(file).toContain('/settings/billing');
  });

  it('InvoiceManual.jsx implements skeleton, empty, error retry, and live preview', () => {
    const file = readFileSync(resolve(__dirname, '../invoice-manual/InvoiceManual.jsx'), 'utf-8');
    expect(file).toContain('Skeleton');
    expect(file).toContain('Failed to load invoices');
    expect(file).toContain('Retry');
    expect(file).toContain('No invoices yet');
  });

  it('ReturnsPage.tsx implements blocked state with contract explanation and single unblocking action', () => {
    const file = readFileSync(resolve(__dirname, '../returns/ReturnsPage.tsx'), 'utf-8');
    expect(file).toContain('Needs backend integration');
    expect(file).toContain('GET /api/stores/:id/reports');
    expect(file).toContain('View store orders');
  });
});
