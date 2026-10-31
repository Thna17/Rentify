import React, { useEffect, useMemo, useState } from 'react';
import { Edit2, Folder, Plus, ShoppingBag, Store, Tag, Trash2 } from 'lucide-react';
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
import { Skeleton } from '@rentify/shared/ui/skeleton';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@rentify/shared/ui/dialog';
import { useChannels } from '../../context/ChannelContext';

// Two kinds of categories: the online store's own (merchant-managed, /api/categories) and the
// marketplace's shared taxonomy (set by Rentify, chosen per product as marketplaceCategory).
type Channel = 'storefront' | 'marketplace';
type StoreCategory = { id: string; name: string; status?: string };

const copy = {
  en: {
    title: 'Categories', subtitle: 'How shoppers browse your products on each channel.',
    storefront: 'Online store', marketplace: 'Marketplace',
    storeHint: 'Your own categories. They appear as menus and filters on your website.',
    marketHint: 'Set by Rentify so buyers can browse every store the same way. Pick one on each product.',
    add: 'Add category', rename: 'Rename category', newTitle: 'New category', placeholder: 'e.g. New arrivals',
    save: 'Save', cancel: 'Cancel', edit: 'Rename', remove: 'Delete',
    products: (n: number) => `${n} product${n === 1 ? '' : 's'}`,
    emptyStore: 'No categories yet', emptyStoreHint: 'Add one to group products on your website.',
    error: 'Categories could not be loaded.', retry: 'Try again',
    nameRequired: 'Enter a category name', saveFailed: 'Could not save the category', deleteFailed: 'Could not delete the category',
    confirmDelete: (name: string) => `Delete "${name}"? Products stay, only the category is removed.`,
    noStore: 'Turn on your online store to create your own categories.',
    uncategorised: 'Not in a category',
    showAll: (n: number) => `Show all categories (${n} more)`, showLess: 'Show only the ones I use',
    retired: 'Old category, buyers can\'t browse to it. Edit these products and pick a current one.',
  },
  km: {
    title: 'ប្រភេទ', subtitle: 'របៀបដែលអ្នកទិញរកមើលផលិតផលរបស់អ្នកលើបណ្ដាញនីមួយៗ។',
    storefront: 'ហាងអនឡាញ', marketplace: 'ផ្សាររួម',
    storeHint: 'ប្រភេទផ្ទាល់ខ្លួនរបស់អ្នក។ បង្ហាញជាម៉ឺនុយ និងតម្រងនៅលើគេហទំព័ររបស់អ្នក។',
    marketHint: 'កំណត់ដោយ Rentify ដើម្បីឱ្យអ្នកទិញរកមើលគ្រប់ហាងតាមរបៀបដូចគ្នា។ ជ្រើសរើសមួយសម្រាប់ផលិតផលនីមួយៗ។',
    add: 'បន្ថែមប្រភេទ', rename: 'ប្ដូរឈ្មោះប្រភេទ', newTitle: 'ប្រភេទថ្មី', placeholder: 'ឧ. ទំនិញមកដល់ថ្មី',
    save: 'រក្សាទុក', cancel: 'បោះបង់', edit: 'ប្ដូរឈ្មោះ', remove: 'លុប',
    products: (n: number) => `ផលិតផល ${n}`,
    emptyStore: 'មិនទាន់មានប្រភេទទេ', emptyStoreHint: 'បន្ថែមមួយ ដើម្បីដាក់ផលិតផលជាក្រុមនៅលើគេហទំព័ររបស់អ្នក។',
    error: 'មិនអាចផ្ទុកប្រភេទបានទេ។', retry: 'ព្យាយាមម្ដងទៀត',
    nameRequired: 'សូមបញ្ចូលឈ្មោះប្រភេទ', saveFailed: 'មិនអាចរក្សាទុកប្រភេទបានទេ', deleteFailed: 'មិនអាចលុបប្រភេទបានទេ',
    confirmDelete: (name: string) => `លុប "${name}"? ផលិតផលនៅដដែល មានតែប្រភេទប៉ុណ្ណោះដែលត្រូវលុប។`,
    noStore: 'បើកហាងអនឡាញរបស់អ្នក ដើម្បីបង្កើតប្រភេទផ្ទាល់ខ្លួន។',
    uncategorised: 'មិនស្ថិតក្នុងប្រភេទ',
    showAll: (n: number) => `បង្ហាញប្រភេទទាំងអស់ (${n} ទៀត)`, showLess: 'បង្ហាញតែប្រភេទដែលខ្ញុំប្រើ',
    retired: 'ប្រភេទចាស់ អ្នកទិញមិនអាចរកឃើញទេ។ កែផលិតផលទាំងនេះ ហើយជ្រើសប្រភេទថ្មី។',
  },
};

const CountPill = ({ children }: { children: React.ReactNode }) => (
  <span className="shrink-0 rounded-full bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{children}</span>
);

export default function CategoriesPage() {
  const { language } = useTranslation() as { language?: string };
  const text = copy[language === 'kh' ? 'km' : 'en'];
  const { websiteId, hasStorefront, hasMarketplace, view, store } = useChannels();
  const [showAllMarket, setShowAllMarket] = useState(false);

  const channels = useMemo<Channel[]>(
    () => [...(hasStorefront ? (['storefront'] as const) : []), ...(hasMarketplace ? (['marketplace'] as const) : [])],
    [hasStorefront, hasMarketplace]
  );
  // Open on the merchant's own categories: the marketplace list is fixed by Rentify
  // and has nothing to add, so starting there hid the Add button.
  const [channel, setChannel] = useState<Channel>(hasStorefront ? 'storefront' : 'marketplace');
  useEffect(() => {
    if (view === 'storefront') setChannel('storefront');
  }, [view]);
  useEffect(() => {
    if (channels.length && !channels.includes(channel)) setChannel(channels[0]);
  }, [channels, channel]);

  // Store categories (online store only)
  const storeQuery = useGetCategoriesQuery(websiteId, { skip: !websiteId });
  const storeCategories: StoreCategory[] = (storeQuery.data || []).filter((c: StoreCategory) => c.status !== 'deleted');
  const [createCategory, { isLoading: creating }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: updating }] = useUpdateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();

  // Product counts per category, from the store's own product list
  const productsQuery = useGetManagedProductsQuery({ websiteId, page: 1, limit: 500 }, { skip: !websiteId });
  // Stores without a website read their products from the Store catalog instead
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  useEffect(() => {
    if (websiteId || !store?.id) return;
    let active = true;
    fetch(`${ECOMMERCE_API_ROOT}/api/stores/${store.id}/products?limit=500`, { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => { if (active) setStoreProducts(result?.products || []); })
      .catch(() => null);
    return () => { active = false; };
  }, [websiteId, store?.id]);
  const products: any[] = websiteId ? productsQuery.data?.products || [] : storeProducts;
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
  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return setFormError(text.nameRequired);
    try {
      if (editing?.id) await updateCategory({ id: editing.id, name: trimmed }).unwrap();
      else await createCategory({ websiteId, name: trimmed }).unwrap();
      setEditing(null);
    } catch (e: any) {
      setFormError(e?.data?.error || text.saveFailed);
    }
  };
  const remove = async (category: StoreCategory) => {
    if (!window.confirm(text.confirmDelete(category.name))) return;
    try {
      await deleteCategory(category.id).unwrap();
    } catch (e: any) {
      window.alert(e?.data?.error || text.deleteFailed);
    }
  };

  const loadingRows = (
    <div className="grid gap-2 sm:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
    </div>
  );
  const errorRow = (onRetry: () => void) => (
    <div role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {text.error}{' '}
      <button type="button" className="font-semibold underline" onClick={onRetry}>{text.retry}</button>
    </div>
  );

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-[1100px] space-y-6 p-4 sm:p-6 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{text.title}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{text.subtitle}</p>
          </div>
          {hasStorefront && websiteId && (
            <Button onClick={() => { setChannel('storefront'); openDialog(); }} className="min-h-[44px] sm:min-h-10">
              <Plus className="mr-2 h-4 w-4" />{text.add}
            </Button>
          )}
        </div>

        {channels.length > 1 && (
          <div role="tablist" aria-label={text.title} className="inline-flex rounded-xl bg-muted p-1">
            {channels.map((value) => {
              const Icon = value === 'storefront' ? Store : ShoppingBag;
              const active = channel === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setChannel(value)}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors ${
                    active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />{text[value]}
                </button>
              );
            })}
          </div>
        )}

        <section className="rounded-2xl bg-muted/40 p-4 sm:p-5" aria-live="polite">
          <p className="mb-4 text-xs text-muted-foreground">{channel === 'storefront' ? text.storeHint : text.marketHint}</p>

          {channel === 'storefront' && (
            !websiteId ? (
              <p className="rounded-xl bg-background px-4 py-6 text-center text-sm text-muted-foreground">{text.noStore}</p>
            ) : storeQuery.isLoading ? loadingRows
              : storeQuery.isError ? errorRow(() => storeQuery.refetch())
              : storeCategories.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl bg-background px-4 py-10 text-center">
                  <Folder className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
                  <p className="text-sm font-medium text-foreground">{text.emptyStore}</p>
                  <p className="text-xs text-muted-foreground">{text.emptyStoreHint}</p>
                  <Button size="sm" className="mt-2" onClick={() => openDialog()}>
                    <Plus className="mr-1.5 h-4 w-4" />{text.add}
                  </Button>
                </div>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {storeCategories.map((category) => (
                    <li key={category.id} className="flex min-h-[56px] items-center gap-3 rounded-xl bg-background px-4 py-2.5">
                      <Folder className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{category.name}</span>
                      <CountPill>{text.products(storeCounts[category.id] || 0)}</CountPill>
                      <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" aria-label={`${text.edit} ${category.name}`} onClick={() => openDialog(category)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive" aria-label={`${text.remove} ${category.name}`} onClick={() => remove(category)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                  {storeCounts[''] > 0 && (
                    <li className="flex min-h-[56px] items-center gap-3 rounded-xl px-4 py-2.5 text-muted-foreground">
                      <Tag className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="flex-1 truncate text-sm">{text.uncategorised}</span>
                      <CountPill>{text.products(storeCounts[''])}</CountPill>
                    </li>
                  )}
                </ul>
              )
          )}

          {channel === 'marketplace' && (
            taxonomyError ? errorRow(loadTaxonomy)
              : taxonomy === null ? loadingRows
              : (
                <>
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {/* The categories this Store uses first; the rest stay one tap away */}
                  {/* Products filed under a category Rentify no longer offers */}
                  {Object.keys(marketCounts).filter((name) => name && !taxonomy.includes(name)).map((name) => (
                    <li key={name} className="flex min-h-[52px] items-start gap-3 rounded-xl bg-warning/10 px-4 py-2.5 sm:col-span-2 lg:col-span-3">
                      <Tag className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground">{name}</span>
                        <span className="block text-xs text-muted-foreground">{text.retired}</span>
                      </span>
                      <CountPill>{text.products(marketCounts[name])}</CountPill>
                    </li>
                  ))}
                  {[...taxonomy]
                    .sort((a, b) => (marketCounts[b] || 0) - (marketCounts[a] || 0))
                    .filter((category, index, list) =>
                      showAllMarket || (marketCounts[category] || 0) > 0 || !list.some((item) => marketCounts[item]))
                    .map((category) => {
                    const count = marketCounts[category] || 0;
                    return (
                      <li key={category} className="flex min-h-[52px] items-center gap-3 rounded-xl bg-background px-4 py-2.5">
                        <Tag className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className={`min-w-0 flex-1 truncate text-sm ${count ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{category}</span>
                        <CountPill>{text.products(count)}</CountPill>
                      </li>
                    );
                  })}
                </ul>
                {taxonomy.some((item) => marketCounts[item]) && taxonomy.some((item) => !marketCounts[item]) && (
                  <Button variant="ghost" className="mt-3 min-h-[44px]" onClick={() => setShowAllMarket((value) => !value)}>
                    {showAllMarket
                      ? text.showLess
                      : text.showAll(taxonomy.filter((item) => !marketCounts[item]).length)}
                  </Button>
                )}
                </>
              )
          )}
        </section>
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? text.rename : text.newTitle}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={name}
            placeholder={text.placeholder}
            aria-label={text.newTitle}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>{text.cancel}</Button>
            <Button onClick={save} disabled={creating || updating}>{text.save}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
