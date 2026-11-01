import { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileSpreadsheet, MoreHorizontal, Package, Pencil, Plus, Search } from 'lucide-react';
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
import { StatusPill } from '../../components/data-table/StatusPill';
import { FilterChips, PageShell, PageTitle, TabBar } from '../../components/page/PagePrimitives';
import CategoriesPage from '../categories/CategoriesPage';

const commerce = `${ECOMMERCE_API_ROOT}/api`;

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
  if (product.status !== 'active') return { key: 'draft', tone: 'neutral' };
  if (product.marketplaceVisibility === false) return { key: 'hidden', tone: 'neutral' };
  if (product.moderationStatus === 'rejected') return { key: 'rejected', tone: 'danger' };
  if (product.moderationStatus && product.moderationStatus !== 'approved') return { key: 'review', tone: 'warning' };
  // Listing is automatic; a Store that is not approved is still setting up or was paused by Rentify.
  if (storeApproval === 'pending') return { key: 'storeNotListed', tone: 'warning' };
  if (storeApproval && storeApproval !== 'approved') return { key: 'storePaused', tone: 'danger' };
  return { key: 'live', tone: 'success' };
};
const storefrontState = (product, hasWebsite) => {
  if (!hasWebsite) return { key: 'noWebsite', tone: 'neutral' };
  if (product.status !== 'active') return { key: 'draft', tone: 'neutral' };
  if (product.storefrontVisibility === false) return { key: 'hidden', tone: 'neutral' };
  return { key: 'live', tone: 'success' };
};

const FILTERS = ['all', 'on_sale', 'out_of_stock', 'hidden', 'drafts'];
const stockOf = (product) => {
  const variants = (product.ProductVariants || []).filter((v) => v.optionValues && Object.keys(v.optionValues).length);
  return variants.length ? variants.reduce((sum, v) => sum + (Number(v.stockQuantity) || 0), 0) : Number(product.stockQuantity) || 0;
};
const matchesFilter = (product, filter, view = 'all', hasStorefront = false) => {
  if (filter === 'on_sale') return Number(product.compareAtPrice) > Number(product.price);
  if (filter === 'out_of_stock') return product.status === 'active' && stockOf(product) <= 0;
  if (filter === 'hidden') {
    if (view === 'storefront') return product.storefrontVisibility === false;
    if (view === 'marketplace') return product.marketplaceVisibility === false;
    return product.marketplaceVisibility === false || (hasStorefront && product.storefrontVisibility === false);
  }
  if (filter === 'drafts') return product.status !== 'active';
  return true;
};

/** "Market ✓  Store ✓" (redesign M8): where buyers can see the product, from API fields only. */
const ChannelBadges = ({ market, store, showStore, t }) => (
  <span className="flex flex-wrap gap-1.5">
    <StatusPill tone={market.tone}>
      {market.key === 'live' ? `${t('merchant.products.market')} ✓` : `${t('merchant.products.market')} · ${t(`merchant.products.state.${market.key}`)}`}
    </StatusPill>
    {showStore && (
      <StatusPill tone={store.tone}>
        {store.key === 'live' ? `${t('merchant.products.store')} ✓` : `${t('merchant.products.store')} · ${t(`merchant.products.state.${store.key}`)}`}
      </StatusPill>
    )}
  </span>
);


export default function StoreCatalogPage({ storeId: suppliedStoreId }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { store: channelStore, hasStorefront, view } = useChannels();
  const [storeId, setStoreId] = useState(suppliedStoreId || null);
  const [storeApproval, setStoreApproval] = useState(channelStore?.marketplaceApprovalStatus || null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'categories' ? 'categories' : 'products';
  const [openId, setOpenId] = useState(null);
  // Grace period and suspension lock new products; the reason is shown by the button
  const [entitlements, setEntitlements] = useState(null);
  useEffect(() => {
    fetch(`${RENTIFY_API_BASE}/api/stores/mine/entitlements`, { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => setEntitlements(result?.data || null))
      .catch(() => null);
  }, []);
  const addLocked = entitlements ? entitlements.mutationsAllowed === false : false;

  // Commerce returns at most 60 products per page
  async function refresh(id) {
    const all = [];
    for (let page = 1; page <= 50; page += 1) {
      const result = await getJson(`${commerce}/stores/${id}/products?limit=60&page=${page}`);
      const rows = result.products || [];
      all.push(...rows);
      if (rows.length < 60 || all.length >= Number(result.total || 0)) break;
    }
    setProducts(all);
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
      await refresh(id);
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



  const filterCounts = useMemo(
    () => Object.fromEntries(FILTERS.map((id) => [id, products.filter((p) => matchesFilter(p, id, view, hasStorefront)).length])),
    [products, view, hasStorefront],
  );

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((product) =>
      matchesFilter(product, filter, view, hasStorefront) &&
      (!term || product.name?.toLowerCase().includes(term) || product.sku?.toLowerCase().includes(term)));
  }, [products, query, filter, view, hasStorefront]);

  const setTab = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id === 'categories') next.set('tab', 'categories');
    else next.delete('tab');
    setSearchParams(next, { replace: true });
  };

  const hasWebsite = (product) => Boolean(product.websiteId) || hasStorefront;
  const addProduct = () => navigate('/products/create');
  const editProduct = (product) => navigate(`/products/edit/${product.id}`);

  return (
    <PageShell>
        <PageTitle
          title={t('merchant.p.products')}
          description={t('merchant.p.onePriceAndOne')}
          actions={
            <>
              {hasStorefront && (
                <Button variant="outline" className="hidden min-h-[44px] rounded-xl sm:inline-flex" onClick={() => navigate('/products/bulk')}>
                  <FileSpreadsheet className="h-4 w-4" aria-hidden="true" /> {t('merchant.products.bulk')}
                </Button>
              )}
              {/* The dashboard banner explains a lock once; the button only says it is paused */}
              <Button
                onClick={addProduct}
                className="min-h-[44px] rounded-xl"
                disabled={addLocked}
                title={addLocked ? t('merchant.products.addPaused') : undefined}
              >
                <Plus className="h-4 w-4" aria-hidden="true" /> {t('merchant.p.addProduct')}
              </Button>
            </>
          }
        />

        <TabBar
          label={t('merchant.p.products')}
          items={[
            { id: 'products', label: t('merchant.products.allProducts'), count: products.length || undefined },
            { id: 'categories', label: t('merchant.products.categories') },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'categories' ? (
          <CategoriesPage embedded />
        ) : (
        <>
        {message && (
          <p role="status" className="rounded-xl bg-muted px-4 py-3 text-sm text-foreground">{message}</p>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label={t('merchant.p.searchProducts')}
            placeholder={t('merchant.p.searchByNameOr')}
            className="h-11 rounded-xl pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {products.length > 0 && (
          <FilterChips
            label={t('merchant.products.filter')}
            items={FILTERS.map((id) => ({ id, label: t(`merchant.products.filters.${id}`), count: filterCounts[id] }))}
            value={filter}
            onChange={setFilter}
          />
        )}

        {/* Product list */}
        <Card className="gap-0 overflow-hidden border-transparent py-0 [box-shadow:var(--shadow-soft)]">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : loadError ? (
            <div role="alert" className="flex flex-col items-center gap-3 px-4 py-12 text-center">
              <p className="text-sm text-destructive">{t('merchant.marketplace.loadError')}</p>
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
                              {variants.length ? t('merchant.products.variants', { count: variants.length }) : product.sku}
                            </span>
                          </span>
                        </button>

                        {/* Phone: stacked summary */}
                        <div className="min-w-0 space-y-1.5 md:hidden">
                          <button type="button" className="block w-full text-left" onClick={() => setOpenId(open ? null : product.id)}>
                            <span className="block truncate font-medium text-foreground">{product.name}</span>
                            <span className="block text-sm text-muted-foreground">
                              {money(product.price)} · <span className={lowStock ? 'text-destructive' : ''}>{t('merchant.products.inStock', { count: stock })}</span>
                              {variants.length ? ` · ${t('merchant.products.variants', { count: variants.length })}` : ''}
                            </span>
                          </button>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-1.5">
                              <ChannelBadges market={market} store={store} showStore={hasWebsite(product)} t={t} />
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-11 w-11 shrink-0 text-muted-foreground hover:text-foreground"
                                  aria-label={t('merchant.table.staff.actionsFor', { name: product.name })}
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
                                  <span>{t(product.status === 'active' ? 'merchant.products.unpublish' : 'merchant.products.publish')}</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        <span className="hidden truncate text-sm text-muted-foreground md:block">{product.marketplaceCategory || '—'}</span>
                        <span className="hidden text-sm font-medium md:block">{money(product.price)}</span>
                        <span className={`hidden text-sm md:block ${lowStock ? 'font-medium text-destructive' : ''}`}>{stock}</span>
                        <div className="hidden flex-wrap gap-1.5 md:flex">
                          <ChannelBadges market={market} store={store} showStore={hasWebsite(product)} t={t} />
                        </div>
                        <div className="hidden justify-end md:flex">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-11 w-11 text-muted-foreground hover:text-foreground"
                                aria-label={t('merchant.table.staff.actionsFor', { name: product.name })}
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
                                <span>{t(product.status === 'active' ? 'merchant.products.unpublish' : 'merchant.products.publish')}</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </li>

                      {open && (
                        <li className="bg-muted/40 px-4 py-4">
                          <div className="grid gap-3 sm:grid-cols-2">
                            {[
                              { name: t('merchant.home.marketplace'), short: 'market', state: market, field: 'marketplaceVisibility', shown: product.marketplaceVisibility !== false },
                              ...(hasWebsite(product)
                                ? [{ name: t('merchant.orders.channels.storefront'), short: 'store', state: store, field: 'storefrontVisibility', shown: product.storefrontVisibility !== false }]
                                : []),
                            ].map((channel) => (
                              <div key={channel.name} className="rounded-xl bg-background p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium text-foreground">{channel.name}</p>
                                    <p className="text-sm text-muted-foreground">{t('merchant.products.priceStock', { price: money(product.price), count: stock })}</p>
                                  </div>
                                  <StatusPill tone={channel.state.tone}>{t(`merchant.products.state.${channel.state.key}`)}</StatusPill>
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
                                    {t(channel.shown ? `merchant.products.hideFrom.${channel.short}` : `merchant.products.showOn.${channel.short}`)}
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
                                    <span className="text-muted-foreground">{money(variant.price)} · {t('merchant.home.left', { count: variant.stockQuantity })}</span>
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
                              {t(product.status === 'active' ? 'merchant.products.unpublishDraft' : 'merchant.products.publish')}
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

        {products.length > 1 && (
          <p className="text-sm text-muted-foreground">{t('merchant.products.bulkHint')}</p>
        )}
        </>
        )}
    </PageShell>
  );
}
