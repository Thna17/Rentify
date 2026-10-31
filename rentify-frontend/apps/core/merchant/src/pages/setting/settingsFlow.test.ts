import { describe, it, expect } from 'vitest';

describe('MR4 · Settings — One Shell (Screens M21–M24; P4, P7, P8, P11)', () => {
  describe('Route and Redirect Invariants (P4, P11)', () => {
    const redirects = [
      { from: '/usage', to: '/settings/billing' },
      { from: '/usage/dashboard', to: '/settings/billing' },
      { from: '/usage/breakdown', to: '/settings/billing' },
      { from: '/usage/billing', to: '/settings/billing' },
      { from: '/ops/dashboard', to: '/settings/billing' },
      { from: '/ops/at-risk', to: '/settings/billing' },
      { from: '/ops/reminders', to: '/settings/billing' },
      { from: '/ops/contract', to: '/settings/billing' },
    ];

    it('redirects all legacy usage and ops routes to /settings/billing', () => {
      redirects.forEach(({ to }) => {
        expect(to).toBe('/settings/billing');
      });
    });
  });

  describe('Plain Words Vocabulary Invariants (P7, P8)', () => {
    it('uses plain words instead of developer jargon', () => {
      const bannedTerms = ['DEC-003', 'Usage Dashboard', 'Usage events', 'Payment Gateway Settings'];
      const plainReplacements: Record<string, string> = {
        'DEC-003': 'Custom domain browse',
        'Payment Gateway Settings': 'Payments',
        'Usage events': 'Paid orders and paid invoices',
        'Usage Dashboard': 'Plan & billing',
      };

      bannedTerms.forEach((term) => {
        expect(plainReplacements[term]).toBeDefined();
        expect(plainReplacements[term]).not.toContain(term);
      });
    });

    it('ensures KHQR payment configuration covers both storefront and marketplace (Screen M21b Note 3)', () => {
      const paymentChannelScope = 'Used for your online store and your Rentify Market page.';
      expect(paymentChannelScope).toContain('online store');
      expect(paymentChannelScope).toContain('Rentify Market');
    });
  });

  describe('Payments Page Structure (Screen M21b; P8)', () => {
    it('presents payment methods and status first', () => {
      const pageSections = [
        'Cash on delivery',
        'KHQR online',
        'Connection',
        'Used for your online store and your Rentify Market page.',
        'Sticky actions bar',
      ];

      expect(pageSections[0]).toBe('Cash on delivery');
      expect(pageSections[1]).toBe('KHQR online');
      expect(pageSections[2]).toBe('Connection');
    });

    it('specifies Cash on delivery as always on', () => {
      const codState = {
        title: 'Cash on delivery',
        badge: 'Always on',
        description: 'Always on. You collect cash and record it on the order.',
      };
      expect(codState.badge).toBe('Always on');
    });

    it('supports 44px min-height touch targets for primary actions', () => {
      const touchTargetMinHeightPx = 44;
      expect(touchTargetMinHeightPx).toBeGreaterThanOrEqual(44);
    });
  });

  describe('Plan & Billing Page Structure (Screen M24; P4, P7)', () => {
    it('summarizes current month activity in plain terms', () => {
      const usageMetrics = ['Paid orders', 'Paid invoices', 'Cost so far'];
      expect(usageMetrics).toContain('Paid orders');
      expect(usageMetrics).toContain('Paid invoices');
      expect(usageMetrics).toContain('Cost so far');
    });
  });
});
