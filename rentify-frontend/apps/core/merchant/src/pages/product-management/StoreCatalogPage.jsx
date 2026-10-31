import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, MoreHorizontal, Package, Pencil, Plus, Search, Truck } from 'lucide-react';
import { ECOMMERCE_API_ROOT, RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import { Card } from '@rentify/shared/ui/card';
import { Input } from '@rentify/shared/ui/input';
import { Button } from '@rentify/shared/ui/button';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@rentify/shared/ui/dropdown-menu';
import { useChannels } from '../../context/ChannelContext';
import { useTranslation } from '@rentify/utils';

const commerce = `${ECOMMERCE_API_ROOT}/api`;
const ALL = 'all';

async function getJson(url, options = {}) {
  const response = await fetch(url, { credentials: 'include', ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
}

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

/**
 * Where a product shows, read only from fields the API returns: product status,
 * moderation, per-channel visibility and the Store's marketplace approval.
 */
const marketplaceState = (product, storeApproval) => {
  if (product.status !== 'active') return { label: 'Draft', tone: 'muted' };
  if (product.marketplaceVisibility === false) return { label: 'Hidden', tone: 'muted' };
  if (product.moderationStatus === 'rejected') return { label: 'Rejected', tone: 'danger' };
  if (product.moderationStatus && product.moderationStatus !== 'approved') return { label: 'In review', tone: 'warning' };
  // Listing is automatic (DEC-028); a Store that is not approved is still setting up or was paused by Rentify.
  if (storeApproval === 'pending') return { label: 'Store not listed yet', tone: 'warning' };
  if (storeApproval && storeApproval !== 'approved') return { label: 'Store paused', tone: 'danger' };
  return { label: 'Live', tone: 'success' };
};
const storefrontState = (product, hasWebsite) => {
  if (!hasWebsite) return { label: 'No website', tone: 'muted' };
  if (product.status !== 'active') return { label: 'Draft', tone: 'muted' };
  if (product.storefrontVisibility === false) return { label: 'Hidden', tone: 'muted' };
  return { label: 'Live', tone: 'success' };
};

const TONES = {
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
  danger: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20',
  muted: 'bg-muted/80 text-muted-foreground border border-border/60',
};

const DOT_TONES = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  muted: 'bg-muted-foreground/60',
};

const ChannelPill = ({ channel, state }) => (
  <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[state?.tone] || TONES.muted}`}>
    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_TONES[state?.tone] || DOT_TONES.muted}`} aria-hidden="true" />
    {channel && <span className="font-semibold">{channel}</span>}
    {channel && state?.label && <span className="opacity-40">·</span>}
    {state?.label && <span>{state.label}</span>}
  </span>
);

/**
 * Returns a consolidated channel status summary pill:
 * - "Both" (when active on both Marketplace and Storefront)
 * - "Marketplace" (when active only on Marketplace)
 * - "Online Store" (when active only on Online Store)
 * - "Draft" / "Hidden" (when not live)
 */
const ProductStatusBadge = ({ product, market, store, hasStorefront }) => {
  const isMarketLive = market?.label === 'Live';
  const isStoreLive = hasStorefront && store?.label === 'Live';

  if (product.status !== 'active') {
    return (
      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES.muted}`}>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_TONES.muted}`} aria-hidden="true" />
        <span>Draft</span>
      </span>
    );
  }

  if (isMarketLive && isStoreLive) {
    return (
      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES.success}`}>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_TONES.success}`} aria-hidden="true" />
        <span>Both</span>
      </span>
    );
  }

  if (isStoreLive) {
    return (
      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES.success}`}>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_TONES.success}`} aria-hidden="true" />
        <span>Online Store</span>
      </span>
    );
  }

  if (isMarketLive) {
    return (
      <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES.success}`}>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_TONES.success}`} aria-hidden="true" />
        <span>Marketplace</span>
      </span>
    );
  }

  // Not live on either (e.g. Hidden, In review, Waiting for approval)
  const primaryState = market?.label !== 'Draft' ? market : store;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[primaryState?.tone] || TONES.muted}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_TONES[primaryState?.tone] || DOT_TONES.muted}`} aria-hidden="true" />
      <span>{primaryState?.label || 'Hidden'}</span>
    </span>
  );
};

export default function StoreCatalogPage({ storeId: suppliedStoreId }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { store: channelStore, hasStorefront } = useChannels();
  const [storeId, setStoreId] = useState(suppliedStoreId || null);
  const [storeApproval, setStoreApproval] = useState(channelStore?.marketplaceApprovalStatus || null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [openId, setOpenId] = useState(null);
  const [deliveryPolicy, setDeliveryPolicy] = useState(null);
  // Grace period and suspension lock new products; the reason is shown by the button
  const [entitlements, setEntitlements] = useState(null);
  useEffect(() => {
    fetch(`${RENTIFY_API_BASE}/api/stores/mine/entitlements`, { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => setEntitlements(result?.data || null))
      .catch(() => null);
  }, []);
  const addLocked = entitlements ? entitlements.mutationsAllowed === false : false;

  async function refresh(id) {
    const result = await getJson(`${commerce}/stores/${id}/products?limit=500`);
    setProducts(result.products || []);
  }

  async function loadDelivery(id) {
    const result = await getJson(`${commerce}/stores/${id}/marketplace-delivery`);
    setDeliveryPolicy(result.policy);
  }

  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      const storeResult = suppliedStoreId
        ? { data: { id: suppliedStoreId, marketplaceApprovalStatus: channelStore?.marketplaceApprovalStatus } }
        : await getJson(`${RENTIFY_API_BASE}/api/stores/mine`);
      const id = storeResult.data.id;
      setStoreId(id);
      setStoreApproval(storeResult.data?.marketplaceApprovalStatus || null);
      // The product list must not disappear just because the delivery-fee call failed.
      const [productsResult] = await Promise.allSettled([refresh(id), loadDelivery(id)]);
      if (productsResult.status === 'rejected') throw productsResult.reason;
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [suppliedStoreId]); // reload only when the Store changes

  async function changeProduct(product, changes) {
    setBusyId(product.id);
    setMessage('');
    try {
      await getJson(`${commerce}/stores/${storeId}/products/${product.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedVersion: product.version, ...changes }),
      });
      await refresh(storeId);
    } catch (error) { setMessage(error.message); }
    finally { setBusyId(null); }
  }



  const categoryCounts = useMemo(() => products.reduce((counts, product) => {
    const key = product.marketplaceCategory || 'Uncategorised';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {}), [products]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) =>
      (categoryFilter === ALL || (product.marketplaceCategory || 'Uncategorised') === categoryFilter) &&
      (!term || product.name?.toLowerCase().includes(term) || product.sku?.toLowerCase().includes(term)));
  }, [products, query, categoryFilter]);

  const hasWebsite = (product) => Boolean(product.websiteId) || hasStorefront;
  const addProduct = () => navigate('/products/create');
  const editProduct = (product) => navigate(`/products/edit/${product.id}`);

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t('merchant.p.products')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('merchant.p.onePriceAndOne')}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {hasStorefront && (
              <Button variant="outline" className="h-11" onClick={() => navigate('/products/manage')}>
                <FileSpreadsheet className="mr-1.5 h-4 w-4" /> Bulk import &amp; export
              </Button>
            )}
            {/* The dashboard banner explains a lock once; the button only says it is paused */}
            <Button
              onClick={addProduct}
              className="h-11"
              disabled={addLocked}
              title={addLocked ? 'Paused until your subscription is renewed' : undefined}
            >
              <Plus className="mr-1.5 h-4 w-4" /> {t('merchant.p.addProduct')}
            </Button>
          </div>
        </div>


        {message && (
          <p role="status" className="rounded-xl bg-muted px-4 py-3 text-sm text-foreground">{message}</p>
        )}

        {/* Search + category filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              aria-label={t('merchant.p.searchProducts')}
              placeholder={t('merchant.p.searchByNameOr')}
              className="h-11 pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {products.length > 0 && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label={t('merchant.p.filterByCategory')}>
              {[[ALL, products.length], ...Object.entries(categoryCounts)].map(([key, count]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={categoryFilter === key}
                  onClick={() => setCategoryFilter(key)}
                  className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors ${
                    categoryFilter === key ? 'bg-foreground text-background' : 'bg-muted text-foreground hover:bg-muted/70'
                  }`}
                >
                  {key === ALL ? 'All' : key}
                  <span className="opacity-60">{count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product list */}
        <Card className="overflow-hidden border-transparent [box-shadow:var(--shadow-soft)]">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : loadError ? (
            <div role="alert" className="flex flex-col items-center gap-3 px-4 py-12 text-center">
              <p className="text-sm text-destructive">Could not load your products. {loadError}</p>
              <Button variant="outline" onClick={load}>{t('merchant.p.tryAgain')}</Button>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
              <Package className="h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
              <p className="font-medium text-foreground">{t('merchant.setup.productsEmptyTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('merchant.setup.productsEmptyBody')}</p>
              <Button onClick={addProduct} className="h-11"><Plus className="mr-1.5 h-4 w-4" /> {t('merchant.p.addProduct')}</Button>
            </div>
          ) : visible.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-muted-foreground">{t('merchant.p.noProductsMatchThis')}</p>
          ) : (
            <>
              <div className="hidden grid-cols-[minmax(0,2.2fr)_1fr_90px_80px_minmax(0,1.6fr)_150px] gap-3 border-b px-4 py-2.5 text-xs font-medium text-muted-foreground md:grid">
                <span>{t('merchant.p.product')}</span><span>{t('merchant.p.category')}</span><span>{t('merchant.p.price')}</span><span>{t('merchant.p.stock')}</span><span>{t('merchant.p.whereItShows')}</span><span className="text-right">{t('merchant.p.actions')}</span>
              </div>
              <ul className="divide-y">
                {visible.map((product) => {
                  const market = marketplaceState(product, storeApproval);
                  const store = storefrontState(product, hasWebsite(product));
                  const variants = (product.ProductVariants || []).filter((variant) =>
                    variant.optionValues && Object.keys(variant.optionValues).length);
                  const open = openId === product.id;
                  // A product with variants sells from its variants, so count those
                  const stock = variants.length
                    ? variants.reduce((sum, variant) => sum + (Number(variant.stockQuantity) || 0), 0)
                    : product.stockQuantity;
                  const lowStock = stock <= (product.lowStockThreshold ?? 5);
                  return (
                    <Fragment key={product.id}>
                      <li className="grid grid-cols-[56px_1fr] gap-3 px-4 py-3 md:grid-cols-[minmax(0,2.2fr)_1fr_90px_80px_minmax(0,1.6fr)_150px] md:items-center">
                        <button
                          type="button"
                          className="flex min-w-0 items-center gap-3 text-left md:col-span-1"
                          aria-expanded={open}
                          onClick={() => setOpenId(open ? null : product.id)}
                        >
                          <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                            {product.images?.[0]?.url || typeof product.images?.[0] === 'string' ? (
                              <img src={product.images[0].url || product.images[0]} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Package className="m-3 h-6 w-6 text-muted-foreground/50" aria-hidden="true" />
                            )}
                          </span>
                          <span className="hidden min-w-0 md:block">
                            <span className="block truncate font-medium text-foreground">{product.name}</span>
                            <span className="block text-xs text-muted-foreground">
                              {variants.length ? `${variants.length} variants` : product.sku}
                            </span>
                          </span>
                        </button>

                        {/* Phone: stacked summary */}
                        <div className="min-w-0 space-y-1.5 md:hidden">
                          <button type="button" className="block w-full text-left" onClick={() => setOpenId(open ? null : product.id)}>
                            <span className="block truncate font-medium text-foreground">{product.name}</span>
                            <span className="block text-sm text-muted-foreground">
                              {money(product.price)} · <span className={lowStock ? 'text-destructive' : ''}>{stock} in stock</span>
                              {variants.length ? ` · ${variants.length} variants` : ''}
                            </span>
                          </button>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-1.5">
                              <ProductStatusBadge
                                product={product}
                                market={market}
                                store={store}
                                hasStorefront={hasWebsite(product)}
                              />
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
                                  aria-label={`Actions for ${product.name}`}
                                >
                                  <MoreHorizontal className="h-5 w-5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  className="flex min-h-10 cursor-pointer items-center gap-2"
                                  onClick={() => editProduct(product)}
                                >
                                  <Pencil className="h-4 w-4" />
                                  <span>{t('merchant.p.editProduct')}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="flex min-h-10 cursor-pointer items-center gap-2"
                                  disabled={busyId === product.id}
                                  onClick={() => changeProduct(product, { status: product.status === 'active' ? 'draft' : 'active' })}
                                >
                                  <span>{product.status === 'active' ? 'Unpublish' : 'Publish'}</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <span className="hidden truncate text-sm text-muted-foreground md:block">{product.marketplaceCategory || '—'}</span>
                        <span className="hidden text-sm font-medium md:block">{money(product.price)}</span>
                        <span className={`hidden text-sm md:block ${lowStock ? 'font-medium text-destructive' : ''}`}>{stock}</span>
                        <div className="hidden flex-wrap gap-1.5 md:flex">
                          <ProductStatusBadge
                            product={product}
                            market={market}
                            store={store}
                            hasStorefront={hasWebsite(product)}
                          />
                        </div>
                        <div className="hidden justify-end md:flex">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                                aria-label={`Actions for ${product.name}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                className="flex min-h-10 cursor-pointer items-center gap-2"
                                onClick={() => editProduct(product)}
                              >
                                <Pencil className="h-4 w-4" />
                                <span>{t('merchant.p.editProduct')}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="flex min-h-10 cursor-pointer items-center gap-2"
                                disabled={busyId === product.id}
                                onClick={() => changeProduct(product, { status: product.status === 'active' ? 'draft' : 'active' })}
                              >
                                <span>{product.status === 'active' ? 'Unpublish' : 'Publish'}</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </li>

                      {open && (
                        <li className="bg-muted/40 px-4 py-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            {[
                              { name: 'Rentify Marketplace', short: 'marketplace', state: market, field: 'marketplaceVisibility', shown: product.marketplaceVisibility !== false },
                              ...(hasWebsite(product)
                                ? [{ name: 'Your online store', short: 'online store', state: store, field: 'storefrontVisibility', shown: product.storefrontVisibility !== false }]
                                : []),
                            ].map((channel) => (
                              <div key={channel.name} className="rounded-xl bg-background p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-foreground">{channel.name}</p>
                                    <p className="text-sm text-muted-foreground">Price {money(product.price)} · Stock {stock}</p>
                                  </div>
                                  <ChannelPill channel="" state={channel.state} />
                                </div>
                                {!channel.disabled && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-3 h-10"
                                    disabled={busyId === product.id}
                                    onClick={() => changeProduct(product, {
                                      [channel.field]: channel.field === 'marketplaceVisibility'
                                        ? (channel.shown ? false : null)
                                        : !channel.shown,
                                    })}
                                  >
                                    {channel.shown ? `Hide from ${channel.short}` : `Show on ${channel.short}`}
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                          {variants.length > 0 && (
                            <div className="mt-3 rounded-xl bg-background p-4">
                              <p className="mb-2 text-sm font-medium text-foreground">{t('merchant.p.variants')}</p>
                              <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
                                {variants.map((variant) => (
                                  <li key={variant.id} className="flex justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2">
                                    <span>{Object.values(variant.optionValues).join(' / ')}</span>
                                    <span className="text-muted-foreground">{money(variant.price)} · {variant.stockQuantity} left</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs text-muted-foreground">
                              {t('merchant.p.priceAndStockAre')}
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-11 md:hidden"
                              disabled={busyId === product.id}
                              onClick={() => changeProduct(product, { status: product.status === 'active' ? 'draft' : 'active' })}
                            >
                              {product.status === 'active' ? 'Unpublish (save as draft)' : 'Publish'}
                            </Button>
                          </div>
                        </li>
                      )}
                    </Fragment>
                  );
                })}
              </ul>
            </>
          )}
        </Card>

        {/* Delivery fee: set once, rarely changed; its home is Settings › Delivery */}
        <Card className="border-transparent [box-shadow:var(--shadow-soft)]">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <span className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <span>
                <span className="block font-medium text-foreground">{t('merchant.p.marketplaceDeliveryFee')}</span>
                <span className="block text-sm text-muted-foreground">
                  {deliveryPolicy ? t('merchant.setup.deliveryPerOrder', { fee: money(deliveryPolicy.flatFee) }) : t('merchant.setup.deliveryNotSet')}
                </span>
              </span>
            </span>
            <Button variant="outline" className="h-11" onClick={() => navigate('/settings/delivery')}>
              {t('merchant.setup.deliveryManage')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
