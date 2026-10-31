import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, ChevronDown, Edit2, Folder, FolderPlus, Lock, Plus, RotateCw, ShoppingBag, Store, Tag, Trash2 } from 'lucide-react';
import { useTranslation } from '@rentify/utils';
import {
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useGetCategoriesQuery,
  useGetManagedProductsQuery,
  useUpdateCategoryMutation,
} from '@rentify/apis';
import { ECOMMERCE_API_ROOT } from '@rentify/shared/config/urls';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@rentify/shared/ui/dialog';
import { useChannels } from '../../context/ChannelContext';

// Two kinds of categories: the online store's own (merchant-managed, /api/categories) and the
// marketplace's shared taxonomy (set by Rentify, chosen per product as marketplaceCategory).
// The header's channel switcher decides which ones show; "All channels" shows both.
type StoreCategory = { id: string; name: string; status?: string };
type MarketRow = { name: string; count: number };

const copy = {
  en: {
    title: 'Categories', subtitle: 'How shoppers browse your products on each channel.',
    storefront: 'Online store', marketplace: 'Marketplace',
    storeHint: 'Your own categories. They appear as menus and filters on your website.',
    marketHint: 'Set by Rentify so buyers can browse every store the same way. Pick one on each product.',
    add: 'Add category', rename: 'Rename category', newTitle: 'New category', placeholder: 'e.g. New arrivals',
    save: 'Save', cancel: 'Cancel', edit: 'Rename', remove: 'Delete',
    products: (n: number) => `${n} product${n === 1 ? '' : 's'}`,
    categories: (n: number) => `${n} categor${n === 1 ? 'y' : 'ies'}`,
    emptyStore: 'No categories yet', emptyStoreHint: 'Add one to group products on your website.',
    error: 'Categories could not be loaded.', retry: 'Try again',
    nameRequired: 'Enter a category name', saveFailed: 'Could not save the category', deleteFailed: 'Could not delete the category',
    confirmDelete: (name: string) => `Delete "${name}"? Products stay, only the category is removed.`,
    deleteTitle: 'Delete category?', deleting: 'Deleting…', saving: 'Saving…',
    deleteMoves: (n: number) => `${n} product${n === 1 ? '' : 's'} in this category will move to "Not in a category".`,
    duplicate: 'You already have a category with this name.',
    noStore: 'Turn on your online store to create your own categories.',
    noChannel: 'Turn on the online store or the marketplace to organise your products into categories.',
    uncategorised: (n: number) => `${n} product${n === 1 ? ' isn\'t' : 's aren\'t'} in a category yet`,
    assign: 'Assign in Products',
    managed: 'Managed by Rentify',
    inUse: 'Used by your products', notUsedYet: 'None of your products has a marketplace category yet. Pick one when you edit a product.',
    allMarket: 'All marketplace categories',
    showAll: (n: number) => `Show all categories (${n} more)`, showLess: 'Hide unused categories',
    retiredTitle: 'Old categories still in use',
    retired: 'Buyers can\'t browse to these any more. Edit these products and pick a current category.',
    statStore: 'Online store categories', statMarket: 'Marketplace categories used', statLoose: 'Products without a category', statLooseStore: 'Products without a store category',
    of: (n: number) => `of ${n}`,
  },
  km: {
    title: 'ប្រភេទ', subtitle: 'របៀបដែលអ្នកទិញរកមើលផលិតផលរបស់អ្នកលើបណ្ដាញនីមួយៗ។',
    storefront: 'ហាងអនឡាញ', marketplace: 'ផ្សាររួម',
    storeHint: 'ប្រភេទផ្ទាល់ខ្លួនរបស់អ្នក។ បង្ហាញជាម៉ឺនុយ និងតម្រងនៅលើគេហទំព័ររបស់អ្នក។',
    marketHint: 'កំណត់ដោយ Rentify ដើម្បីឱ្យអ្នកទិញរកមើលគ្រប់ហាងតាមរបៀបដូចគ្នា។ ជ្រើសរើសមួយសម្រាប់ផលិតផលនីមួយៗ។',
    add: 'បន្ថែមប្រភេទ', rename: 'ប្ដូរឈ្មោះប្រភេទ', newTitle: 'ប្រភេទថ្មី', placeholder: 'ឧ. ទំនិញមកដល់ថ្មី',
    save: 'រក្សាទុក', cancel: 'បោះបង់', edit: 'ប្ដូរឈ្មោះ', remove: 'លុប',
    products: (n: number) => `ផលិតផល ${n}`,
    categories: (n: number) => `${n} ប្រភេទ`,
    emptyStore: 'មិនទាន់មានប្រភេទទេ', emptyStoreHint: 'បន្ថែមមួយ ដើម្បីដាក់ផលិតផលជាក្រុមនៅលើគេហទំព័ររបស់អ្នក។',
    error: 'មិនអាចផ្ទុកប្រភេទបានទេ។', retry: 'ព្យាយាមម្ដងទៀត',
    nameRequired: 'សូមបញ្ចូលឈ្មោះប្រភេទ', saveFailed: 'មិនអាចរក្សាទុកប្រភេទបានទេ', deleteFailed: 'មិនអាចលុបប្រភេទបានទេ',
    confirmDelete: (name: string) => `លុប "${name}"? ផលិតផលនៅដដែល មានតែប្រភេទប៉ុណ្ណោះដែលត្រូវលុប។`,
    deleteTitle: 'លុបប្រភេទ?', deleting: 'កំពុងលុប…', saving: 'កំពុងរក្សាទុក…',
    deleteMoves: (n: number) => `ផលិតផល ${n} ក្នុងប្រភេទនេះ នឹងផ្លាស់ទៅ «មិនស្ថិតក្នុងប្រភេទ»។`,
    duplicate: 'អ្នកមានប្រភេទដែលមានឈ្មោះនេះរួចហើយ។',
    noStore: 'បើកហាងអនឡាញរបស់អ្នក ដើម្បីបង្កើតប្រភេទផ្ទាល់ខ្លួន។',
    noChannel: 'បើកហាងអនឡាញ ឬផ្សាររួម ដើម្បីរៀបចំផលិតផលរបស់អ្នកជាប្រភេទ។',
    uncategorised: (n: number) => `ផលិតផល ${n} មិនទាន់ស្ថិតក្នុងប្រភេទណាមួយទេ`,
    assign: 'កំណត់នៅក្នុងផលិតផល',
    managed: 'គ្រប់គ្រងដោយ Rentify',
    inUse: 'ប្រើដោយផលិតផលរបស់អ្នក', notUsedYet: 'មិនទាន់មានផលិតផលណាមួយមានប្រភេទផ្សាររួមនៅឡើយទេ។ សូមជ្រើសរើសមួយនៅពេលកែផលិតផល។',
    allMarket: 'ប្រភេទផ្សាររួមទាំងអស់',
    showAll: (n: number) => `បង្ហាញប្រភេទទាំងអស់ (${n} ទៀត)`, showLess: 'លាក់ប្រភេទដែលមិនប្រើ',
    retiredTitle: 'ប្រភេទចាស់ដែលនៅតែប្រើ',
    retired: 'អ្នកទិញមិនអាចរកឃើញប្រភេទទាំងនេះទៀតទេ។ កែផលិតផលទាំងនេះ ហើយជ្រើសប្រភេទថ្មី។',
    statStore: 'ប្រភេទហាងអនឡាញ', statMarket: 'ប្រភេទផ្សាររួមដែលបានប្រើ', statLoose: 'ផលិតផលគ្មានប្រភេទ', statLooseStore: 'ផលិតផលគ្មានប្រភេទហាង',
    of: (n: number) => `ក្នុងចំណោម ${n}`,
  },
};
type Copy = typeof copy.en;

const TONE = {
  storefront: 'bg-[var(--rentify-color-info-subtle)] text-[var(--rentify-color-info-text)]',
  marketplace: 'bg-[var(--rentify-color-warning-subtle)] text-[var(--rentify-color-warning-text)]',
};

const Surface = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <section className={`rounded-3xl bg-card p-5 shadow-[var(--shadow-soft)] md:p-6 ${className}`}>{children}</section>
);

const CountPill = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">{children}</span>
);

const SectionHeader = ({ icon: Icon, tone, title, hint, aside, id }: {
  icon: React.ElementType; tone: string; title: string; hint?: string; aside?: React.ReactNode; id: string;
}) => (
  <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
    <div className="flex min-w-0 items-start gap-3">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h2 id={id} className="text-[17px] font-semibold tracking-tight text-foreground">{title}</h2>
        {hint && <p className="mt-0.5 max-w-xl text-[13px] leading-relaxed text-muted-foreground">{hint}</p>}
      </div>
    </div>
    {aside}
  </header>
);

const ErrorState = ({ text, onRetry }: { text: Copy; onRetry: () => void }) => (
  <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl bg-muted px-4 py-10 text-center">
    <AlertTriangle className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
    <p className="text-sm text-foreground">{text.error}</p>
    <Button variant="outline" className="min-h-11" onClick={onRetry}>
      <RotateCw className="mr-2 h-4 w-4" aria-hidden="true" />{text.retry}
    </Button>
  </div>
);

const TileSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="flex h-[76px] items-center gap-3 rounded-2xl bg-muted p-4">
        <div className="h-10 w-10 animate-pulse rounded-xl bg-card" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-2/3 animate-pulse rounded bg-card" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-card" />
        </div>
      </div>
    ))}
  </div>
);

const Stat = ({ label, value, sub, loading }: { label: string; value: number; sub?: string; loading: boolean }) => (
  // Phones: a compact row (label left, number right) so three stats don't fill the screen.
  <div className="flex min-h-[60px] items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 shadow-[var(--shadow-soft)] sm:min-h-[104px] sm:flex-col sm:items-start sm:justify-between sm:gap-2 sm:rounded-3xl sm:p-5">
    <p className="min-w-0 text-[13px] font-medium text-muted-foreground">{label}</p>
    {loading ? (
      <div className="h-7 w-16 shrink-0 animate-pulse rounded-lg bg-muted" />
    ) : (
      <p className="flex shrink-0 items-baseline gap-2 text-[22px] font-semibold leading-none tracking-tight text-foreground tabular-nums sm:text-[26px]">
        {value}
        {sub && <span className="text-[13px] font-medium tracking-normal text-muted-foreground">{sub}</span>}
      </p>
    )}
  </div>
);

/** `embedded`: shown as the Categories tab inside Products (redesign M10), without its own page frame. */
export default function CategoriesPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { language } = useTranslation() as { language?: string };
  const text = copy[language === 'kh' ? 'km' : 'en'];
  const { websiteId, hasStorefront, hasMarketplace, view, store } = useChannels();
  const [showAllMarket, setShowAllMarket] = useState(false);

  // POS has no categories of its own, so it reads like "All channels".
  const combined = view === 'all' || view === 'pos';
  const showStore = hasStorefront && (combined || view === 'storefront');
  const showMarket = hasMarketplace && (combined || view === 'marketplace');
  const both = showStore && showMarket;

  // Store categories (online store only)
  const storeQuery = useGetCategoriesQuery(websiteId, { skip: !websiteId });
  const storeCategories: StoreCategory[] = (storeQuery.data || []).filter((c: StoreCategory) => c.status !== 'deleted');
  const [createCategory, { isLoading: creating }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: updating }] = useUpdateCategoryMutation();
  const [deleteCategory, { isLoading: removing }] = useDeleteCategoryMutation();

  // Product counts per category, from the store's own product list
  const productsQuery = useGetManagedProductsQuery({ websiteId, page: 1, limit: 500 }, { skip: !websiteId });
  // Stores without a website read their products from the Store catalog instead
  const [storeProducts, setStoreProducts] = useState<any[] | null>(null);
  useEffect(() => {
    if (websiteId || !store?.id) return;
    let active = true;
    fetch(`${ECOMMERCE_API_ROOT}/api/stores/${store.id}/products?limit=500`, { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => { if (active) setStoreProducts(result?.products || []); })
      .catch(() => { if (active) setStoreProducts([]); });
    return () => { active = false; };
  }, [websiteId, store?.id]);
  const products: any[] = (websiteId ? productsQuery.data?.products : storeProducts) || [];
  const productsLoading = websiteId ? productsQuery.isLoading : storeProducts === null;
  const countBy = (key: 'categoryId' | 'marketplaceCategory') =>
    products.reduce<Record<string, number>>((acc, p) => {
      const value = p?.[key] || '';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  const storeCounts = useMemo(() => countBy('categoryId'), [products]);
  const marketCounts = useMemo(() => countBy('marketplaceCategory'), [products]);

  // Marketplace taxonomy (public, fixed by Rentify)
  const [taxonomy, setTaxonomy] = useState<string[] | null>(null);
  const [taxonomyError, setTaxonomyError] = useState(false);
  const loadTaxonomy = async () => {
    setTaxonomyError(false);
    try {
      const response = await fetch(`${ECOMMERCE_API_ROOT}/api/marketplace/categories`);
      if (!response.ok) throw new Error('Taxonomy unavailable');
      setTaxonomy((await response.json()).categories || []);
    } catch {
      setTaxonomyError(true);
    }
  };
  useEffect(() => { if (hasMarketplace) loadTaxonomy(); }, [hasMarketplace]);

  // Add / rename dialog: null = closed, {} = new, {id, name} = rename
  const [editing, setEditing] = useState<{ id?: string; name?: string } | null>(null);
  const [name, setName] = useState('');
  const [formError, setFormError] = useState('');
  const openDialog = (category?: StoreCategory) => {
    setEditing(category ? { id: category.id, name: category.name } : {});
    setName(category?.name || '');
    setFormError('');
  };
  const saving = creating || updating;
  const save = async () => {
    if (saving) return;
    const trimmed = name.trim();
    if (!trimmed) return setFormError(text.nameRequired);
    // Renaming to the same name is a no-op, not a request
    if (editing?.id && trimmed === editing.name) return setEditing(null);
    const taken = storeCategories.some(
      (category) => category.id !== editing?.id && category.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (taken) return setFormError(text.duplicate);
    try {
      if (editing?.id) await updateCategory({ id: editing.id, name: trimmed }).unwrap();
      else await createCategory({ websiteId, name: trimmed }).unwrap();
      setEditing(null);
    } catch (e: any) {
      setFormError(e?.data?.error || text.saveFailed);
    }
  };

  // Delete confirmation: the category to remove, or null when closed
  const [deleting, setDeleting] = useState<StoreCategory | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const remove = (category: StoreCategory) => {
    setDeleting(category);
    setDeleteError('');
  };
  const confirmRemove = async () => {
    if (!deleting || removing) return;
    try {
      await deleteCategory(deleting.id).unwrap();
      setDeleting(null);
    } catch (e: any) {
      setDeleteError(e?.data?.error || text.deleteFailed);
    }
  };

  // Marketplace: retired names still on products, the ones in use, and the rest
  const market = useMemo(() => {
    if (!taxonomy) return { retired: [] as MarketRow[], used: [] as MarketRow[], unused: [] as string[], max: 0 };
    const retired = Object.keys(marketCounts)
      .filter((category) => category && !taxonomy.includes(category))
      .map((category) => ({ name: category, count: marketCounts[category] }));
    const used = taxonomy
      .filter((category) => marketCounts[category])
      .map((category) => ({ name: category, count: marketCounts[category] }))
      .sort((a, b) => b.count - a.count);
    const unused = taxonomy.filter((category) => !marketCounts[category]);
    const max = Math.max(1, ...used.map((row) => row.count), ...retired.map((row) => row.count));
    return { retired, used, unused, max };
  }, [taxonomy, marketCounts]);

  const statCount = (showStore && websiteId ? 1 : 0) + (showMarket ? 1 : 0) + 1;
  const loose = showStore ? storeCounts[''] || 0 : marketCounts[''] || 0;
  const pageHint = both || (!showStore && !showMarket) ? text.subtitle : showStore ? text.storeHint : text.marketHint;

  return (
    <div className={embedded ? '' : 'min-h-full'}>
      <div className={embedded ? 'space-y-6' : 'mx-auto max-w-[1100px] space-y-6 p-4 sm:p-6 md:p-8'}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {embedded ? null : <h1 className="text-2xl font-semibold tracking-tight text-foreground">{text.title}</h1>}
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{pageHint}</p>
          </div>
          {showStore && websiteId && (
            <Button onClick={() => openDialog()} className="min-h-11 shrink-0 rounded-xl">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />{text.add}
            </Button>
          )}
        </div>

        {!showStore && !showMarket && (
          <Surface className="flex flex-col items-center gap-3 py-12 text-center">
            <Folder className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
            <p className="max-w-md text-sm text-muted-foreground">{text.noChannel}</p>
          </Surface>
        )}

        {(showStore || showMarket) && (
          <div className={`grid grid-cols-1 gap-2.5 sm:gap-4 ${statCount === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            {showStore && websiteId && (
              <Stat label={text.statStore} value={storeCategories.length} loading={storeQuery.isLoading} />
            )}
            {showMarket && (
              <Stat
                label={text.statMarket}
                value={market.used.length}
                sub={taxonomy ? text.of(taxonomy.length) : undefined}
                loading={taxonomy === null && !taxonomyError}
              />
            )}
            <Stat label={both ? text.statLooseStore : text.statLoose} value={loose} loading={productsLoading} />
          </div>
        )}

        {showStore && (
          <Surface>
            <SectionHeader
              id="store-categories"
              icon={Store}
              tone={TONE.storefront}
              title={text.storefront}
              hint={both ? text.storeHint : undefined}
              aside={websiteId && !storeQuery.isLoading && !storeQuery.isError ? <CountPill>{text.categories(storeCategories.length)}</CountPill> : null}
            />
            {!websiteId ? (
              <p className="rounded-2xl bg-muted px-4 py-10 text-center text-sm text-muted-foreground">{text.noStore}</p>
            ) : storeQuery.isLoading ? (
              <TileSkeleton />
            ) : storeQuery.isError ? (
              <ErrorState text={text} onRetry={() => storeQuery.refetch()} />
            ) : storeCategories.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-muted px-4 py-12 text-center">
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${TONE.storefront}`}>
                  <FolderPlus className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold text-foreground">{text.emptyStore}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{text.emptyStoreHint}</p>
                </div>
                <Button className="mt-1 min-h-11 rounded-xl" onClick={() => openDialog()}>
                  <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />{text.add}
                </Button>
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-labelledby="store-categories">
                {storeCategories.map((category) => {
                  const count = storeCounts[category.id] || 0;
                  return (
                    <li key={category.id} className="group flex min-h-[76px] items-center gap-3 rounded-2xl bg-muted p-3 pl-4 transition-colors hover:bg-foreground/[0.06]">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card text-[var(--rentify-color-info-text)] shadow-[var(--shadow-soft)]">
                        <Folder className="h-[18px] w-[18px]" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 break-words font-medium leading-snug text-foreground" title={category.name}>{category.name}</p>
                        <p className={`text-[12.5px] tabular-nums ${count ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>{text.products(count)}</p>
                      </div>
                      <div className="flex shrink-0 items-center opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                        <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl md:h-9 md:w-9" aria-label={`${text.edit} ${category.name}`} onClick={() => openDialog(category)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl md:h-9 md:w-9 text-muted-foreground hover:text-destructive" aria-label={`${text.remove} ${category.name}`} onClick={() => remove(category)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
                <li>
                  <button
                    type="button"
                    onClick={() => openDialog()}
                    className="flex h-full min-h-[76px] w-full items-center justify-center gap-2 rounded-2xl text-sm font-medium text-muted-foreground outline-dashed outline-1 -outline-offset-1 outline-foreground/15 transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />{text.add}
                  </button>
                </li>
              </ul>
            )}
            {websiteId && !storeQuery.isLoading && storeCounts[''] > 0 && (
              <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-[var(--rentify-color-warning-subtle)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2.5 text-sm text-[var(--rentify-color-warning-text)]">
                  <Tag className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {text.uncategorised(storeCounts[''])}
                </p>
                <Link to="/products" className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-[var(--rentify-color-warning-text)] hover:underline sm:self-auto">
                  {text.assign}<ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            )}
          </Surface>
        )}

        {showMarket && (
          <Surface>
            <SectionHeader
              id="market-categories"
              icon={ShoppingBag}
              tone={TONE.marketplace}
              title={text.marketplace}
              hint={both ? text.marketHint : undefined}
              aside={
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <Lock className="h-3 w-3" aria-hidden="true" />{text.managed}
                </span>
              }
            />
            {taxonomyError ? (
              <ErrorState text={text} onRetry={loadTaxonomy} />
            ) : taxonomy === null || productsLoading ? (
              <TileSkeleton count={3} />
            ) : (
              <div className="space-y-5">
                {market.retired.length > 0 && (
                  <div role="status" className="rounded-2xl bg-[var(--rentify-color-warning-subtle)] p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-[var(--rentify-color-warning-text)]">
                      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />{text.retiredTitle}
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-[var(--rentify-color-warning-text)]">{text.retired}</p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {market.retired.map((row) => (
                        <li key={row.name} className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-[13px] text-foreground">
                          {row.name}<span className="tabular-nums text-muted-foreground">{row.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h3 className="mb-3 text-[13px] font-medium text-muted-foreground">{text.inUse}</h3>
                  {market.used.length === 0 ? (
                    <p className="rounded-2xl bg-muted px-4 py-6 text-center text-sm text-muted-foreground">{text.notUsedYet}</p>
                  ) : (
                    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {market.used.map((row) => (
                        <li key={row.name} className="rounded-2xl bg-muted p-4">
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex min-w-0 items-center gap-2.5">
                              <Tag className="h-4 w-4 shrink-0 text-[var(--rentify-color-warning-text)]" aria-hidden="true" />
                              <span className="truncate font-medium text-foreground" title={row.name}>{row.name}</span>
                            </span>
                            <span className="shrink-0 text-[12.5px] tabular-nums text-muted-foreground">{text.products(row.count)}</span>
                          </div>
                          {/* Share of this store's products, so the main categories stand out */}
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-card" aria-hidden="true">
                            <div className="h-full rounded-full bg-[var(--rentify-color-warning-base)]" style={{ width: `${Math.max(6, (row.count / market.max) * 100)}%` }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {market.unused.length > 0 && (
                  <div>
                    <button
                      type="button"
                      aria-expanded={showAllMarket}
                      aria-controls="market-unused"
                      onClick={() => setShowAllMarket((value) => !value)}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-1 text-sm font-medium text-foreground hover:text-foreground/80"
                    >
                      {showAllMarket ? text.showLess : market.used.length ? text.showAll(market.unused.length) : text.allMarket}
                      <ChevronDown className={`h-4 w-4 transition-transform ${showAllMarket ? 'rotate-180' : ''}`} aria-hidden="true" />
                    </button>
                    {showAllMarket && (
                      <ul id="market-unused" className="mt-2 flex flex-wrap gap-2">
                        {market.unused.map((category) => (
                          <li key={category} className="rounded-full bg-muted px-3 py-1.5 text-[13px] text-muted-foreground">{category}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </Surface>
        )}
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? text.rename : text.newTitle}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); save(); }}
          >
            <Input
              autoFocus
              value={name}
              maxLength={80}
              placeholder={text.placeholder}
              aria-label={editing?.id ? text.rename : text.newTitle}
              aria-invalid={Boolean(formError)}
              aria-describedby={formError ? 'category-name-error' : undefined}
              onChange={(e) => { setName(e.target.value); if (formError) setFormError(''); }}
            />
            {formError && <p id="category-name-error" role="alert" className="text-sm text-destructive">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" className="min-h-11" onClick={() => setEditing(null)}>{text.cancel}</Button>
              <Button type="submit" className="min-h-11" disabled={saving}>{saving ? text.saving : text.save}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && !removing && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{text.deleteTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-relaxed text-muted-foreground">{deleting ? text.confirmDelete(deleting.name) : ''}</p>
          {deleting && (storeCounts[deleting.id] || 0) > 0 && (
            <p className="rounded-xl bg-[var(--rentify-color-warning-subtle)] px-3 py-2 text-sm text-[var(--rentify-color-warning-text)]">{text.deleteMoves(storeCounts[deleting.id])}</p>
          )}
          {deleteError && <p role="alert" className="text-sm text-destructive">{deleteError}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" className="min-h-11" disabled={removing} onClick={() => setDeleting(null)}>{text.cancel}</Button>
            <Button type="button" variant="destructive" className="min-h-11" disabled={removing} onClick={confirmRemove}>
              {removing ? text.deleting : text.remove}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
