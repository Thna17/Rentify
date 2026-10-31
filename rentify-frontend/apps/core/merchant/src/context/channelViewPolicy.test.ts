import { describe, expect, it } from 'vitest';
import { resolveChannelView } from './channelViewPolicy';

describe('seller workspace defaults', () => {
  it('opens marketplace for a seller without a website, even when POS is available', () => {
    expect(resolveChannelView(null, ['all', 'marketplace', 'pos'])).toBe('marketplace');
  });
  it('opens the full storefront workspace for a merchant with a website', () => {
    expect(resolveChannelView(null, ['all', 'marketplace', 'storefront', 'pos'])).toBe('storefront');
  });
  it('respects an explicit choice to use marketplace or combined reporting', () => {
    expect(resolveChannelView('marketplace', ['all', 'marketplace', 'storefront'])).toBe('marketplace');
    expect(resolveChannelView('all', ['all', 'marketplace', 'storefront'])).toBe('all');
  });
  it('falls back to the correct workspace when a channel disappears or storage is invalid', () => {
    expect(resolveChannelView('storefront', ['all', 'marketplace'])).toBe('marketplace');
    expect(resolveChannelView('invalid', ['all', 'storefront'])).toBe('storefront');
    expect(resolveChannelView(null, ['all', 'pos'])).toBe('pos');
    expect(resolveChannelView(null, ['all'])).toBe('all');
  });
});
