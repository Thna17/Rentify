import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

describe('MR8 · Customers flow (Screens M11 & M12)', () => {
  it('Customers.jsx adheres to wireframe Screen M11 with channel filter chips and search', () => {
    const filePath = resolve(__dirname, 'Customers.jsx');
    expect(existsSync(filePath)).toBe(true);

    const content = readFileSync(filePath, 'utf-8');
    // Channel chips
    expect(content).toContain('CHANNEL_CHIPS');
    expect(content).toContain('Marketplace');
    expect(content).toContain('Online store');
    expect(content).toContain('POS');

    // M11 search
    expect(content).toContain('Search name or phone');

    // M12 customer detail drawer
    expect(content).toContain('SheetContent');
    expect(content).toContain('maskPhone');
    expect(content).toContain('Telegram');
    expect(content).toContain('Customer orders');
  });
});
