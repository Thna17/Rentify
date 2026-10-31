import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('MR8 · Home, Reports, Customers, Returns, and Help flow integrity', () => {
  it('Overview.tsx adheres to wireframe Screen M1 layout and action tiles', () => {
    const overviewPath = resolve(__dirname, 'Overview.tsx');
    expect(existsSync(overviewPath)).toBe(true);

    const content = readFileSync(overviewPath, 'utf-8');
    // Screen M1 requirements
    expect(content).toContain('Needs your attention');
    expect(content).toContain('New orders to confirm');
    expect(content).toContain('To deliver');
    expect(content).toContain('Cash to collect');
    expect(content).toContain('Problems to answer');
    expect(content).toContain('Where you sell');
    expect(content).toContain('Rentify Market');
    expect(content).toContain('Online store');
    expect(content).toContain('Point of sale');
    expect(content).toContain('Recent orders');
    expect(content).toContain('Low stock');

    // Wireframe Note 3: Channel switcher removed; chips filter Home locally
    expect(content).toContain('CHANNELS_FILTER');
    expect(content).toContain('activeChannel');

    // Navigation redirects & targets
    expect(content).toContain('/orders?tab=to_confirm');
    expect(content).toContain('/orders?tab=to_deliver');
    expect(content).toContain('/orders?tab=cash_to_collect');
    expect(content).toContain('/returns');
    expect(content).toContain('/reports');
    expect(content).toContain('/marketplace');
    expect(content).toContain('/online-store');
  });

  it('PlatformAnalytics.jsx adheres to Screen M13 with Reports title and backend dashed chip', () => {
    const reportsPath = resolve(__dirname, 'PlatformAnalytics.jsx');
    expect(existsSync(reportsPath)).toBe(true);

    const content = readFileSync(reportsPath, 'utf-8');
    expect(content).toContain('Reports');
    expect(content).toContain('Needs backend · store-wide sales statistics');
  });

  it('ReturnsPage.tsx adheres to Screen M6 Note 2 with blocked state and backend contract details', () => {
    const returnsPath = resolve(__dirname, '../returns/ReturnsPage.tsx');
    expect(existsSync(returnsPath)).toBe(true);

    const content = readFileSync(returnsPath, 'utf-8');
    expect(content).toContain('Returns & problems');
    expect(content).toContain('Needs backend integration');
    expect(content).toContain('GET /api/stores/:id/reports');
  });
});
