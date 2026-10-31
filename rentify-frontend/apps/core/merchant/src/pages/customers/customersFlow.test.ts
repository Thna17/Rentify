import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Customers (redesign M11, M12)', () => {
  const content = readFileSync(resolve(__dirname, 'Customers.jsx'), 'utf-8');
  const hook = readFileSync(resolve(__dirname, '../../hooks/useCustomers.js'), 'utf-8');

  it('filters by channel with the shared chips and searches by name or phone', () => {
    expect(content).toContain('FilterChips');
    expect(content).toContain('c.channels.has(selectedChannel)');
    expect(content).toContain("t('merchant.customers.search')");
  });

  it('builds customers from orders on every channel, not only the online store', () => {
    expect(hook).toContain("useChannelOrders('all', 'all')");
    expect(hook).not.toContain('useGetOrderHistoryQuery');
  });

  it('shows no invented figures in the customer drawer', () => {
    expect(content).toContain('SheetContent');
    expect(content).not.toMatch(/Returns<\/p>/);
  });
});
