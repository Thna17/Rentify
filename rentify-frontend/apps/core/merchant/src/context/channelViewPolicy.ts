export type ChannelView = 'all' | 'marketplace' | 'storefront' | 'pos';

/** Start in the merchant's actual selling workspace; combined reporting is opt-in. */
export function resolveChannelView(
  saved: string | null,
  available: ChannelView[],
): ChannelView {
  if (saved && available.includes(saved as ChannelView)) return saved as ChannelView;
  if (available.includes('storefront')) return 'storefront';
  if (available.includes('marketplace')) return 'marketplace';
  if (available.includes('pos')) return 'pos';
  return 'all';
}
