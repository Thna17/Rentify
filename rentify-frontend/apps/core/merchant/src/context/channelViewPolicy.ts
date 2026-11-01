export type ChannelView = 'all' | 'marketplace' | 'storefront' | 'pos';

/**
 * Start on every channel, so no order is hidden by a choice the merchant never made;
 * a channel they pick in the header is remembered while that channel exists.
 */
export function resolveChannelView(
  saved: string | null,
  available: ChannelView[],
): ChannelView {
  if (saved && available.includes(saved as ChannelView)) return saved as ChannelView;
  return 'all';
}
