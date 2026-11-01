import { describe, expect, it } from 'vitest';
import { resolveChannelView } from './channelViewPolicy';

describe('dashboard channel view', () => {
  it('starts on every channel until the merchant picks one', () => {
    expect(resolveChannelView(null, ['all', 'marketplace', 'pos'])).toBe('all');
    expect(resolveChannelView(null, ['all', 'marketplace', 'storefront', 'pos'])).toBe('all');
  });
  it('respects an explicit choice to use marketplace or combined reporting', () => {
    expect(resolveChannelView('marketplace', ['all', 'marketplace', 'storefront'])).toBe('marketplace');
    expect(resolveChannelView('all', ['all', 'marketplace', 'storefront'])).toBe('all');
  });
  it('goes back to every channel when the saved one disappears or storage is invalid', () => {
    expect(resolveChannelView('storefront', ['all', 'marketplace'])).toBe('all');
    expect(resolveChannelView('invalid', ['all', 'storefront'])).toBe('all');
    expect(resolveChannelView(null, ['all'])).toBe('all');
  });
});
