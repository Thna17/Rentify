import { useCallback, useEffect, useState } from 'react';
import { ECOMMERCE_API_ROOT } from '@rentify/shared/config/urls';
import { useChannels } from '../context/ChannelContext';

export type ListingStatus = 'listed' | 'pending' | 'paused' | 'off' | 'unknown';
export type HiddenReason = 'draft' | 'review' | 'removed' | 'turned_off' | 'no_category';

export interface StoreProduct {
  id: string;
  name: string;
  price: string | number;
  status: string;
  stockQuantity: number;
  moderationStatus?: string | null;
  marketplaceVisibility?: boolean | null;
  marketplaceCategory?: string | null;
}

/** The Store's marketplace listing from Core's approval state (DEC-028: automatic once ready). */
export function listingStatus(store: Record<string, any> | null | undefined): ListingStatus {
  if (!store) return 'unknown';
  if (store.marketplaceEnabled === false) return 'off';
  const approval = String(store.marketplaceApprovalStatus || '').toLowerCase();
  if (approval === 'approved') return 'listed';
  if (approval === 'pending') return 'pending';
  if (['needs_changes', 'rejected', 'suspended'].includes(approval)) return 'paused';
  return 'unknown';
}

/**
 * Why buyers can't see a product on the marketplace, using the same fields as Commerce's public
 * marketplace query (buildPublicMarketplaceWhere). Null means it is shown. Stock is not part of
 * that rule: a sold-out product stays listed and buyers see it as sold out.
 */
export function hiddenReason(product: StoreProduct, storeMarketplaceEnabled = true): HiddenReason | null {
  if (product.status !== 'active') return 'draft';
  const moderation = String(product.moderationStatus || '').toLowerCase();
  if (moderation && moderation !== 'approved') return moderation === 'flagged' || moderation === 'pending' ? 'review' : 'removed';
  if (product.marketplaceVisibility === false || (product.marketplaceVisibility == null && !storeMarketplaceEnabled)) return 'turned_off';
  if (!product.marketplaceCategory) return 'no_category';
  return null;
}

const PAGE = 60; // Commerce caps GET /api/stores/:storeId/products at 60 per page

/** Every product of the Store, with how each one appears on the marketplace. */
export function useMarketplaceListing() {
  const { store } = useChannels();
  const storeId = store?.id as string | undefined;
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!storeId) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    (async () => {
      const all: StoreProduct[] = [];
      for (let page = 1; page <= 50; page += 1) {
        const res = await fetch(`${ECOMMERCE_API_ROOT}/api/stores/${encodeURIComponent(storeId)}/products?limit=${PAGE}&page=${page}`, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const rows: StoreProduct[] = Array.isArray(data?.products) ? data.products : [];
        all.push(...rows);
        if (rows.length < PAGE || all.length >= Number(data?.total || 0)) break;
      }
      setProducts(all);
    })()
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [storeId, reloadKey]);

  const enabled = store?.marketplaceEnabled !== false;
  const shown = products.filter((p) => hiddenReason(p, enabled) === null);
  const hidden = products.filter((p) => hiddenReason(p, enabled) !== null);

  return {
    status: listingStatus(store),
    products,
    shown,
    hidden,
    loading: loading && !error,
    error,
    reload: useCallback(() => setReloadKey((k) => k + 1), []),
  };
}

export default useMarketplaceListing;
