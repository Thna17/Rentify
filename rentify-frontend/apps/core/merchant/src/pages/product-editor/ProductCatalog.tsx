import { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, FileSpreadsheet, Package, Pencil, Plus, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@rentify/utils';
import { Button } from '@rentify/shared/ui/button';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { Input } from '@rentify/shared/ui/input';
import { Badge } from '@rentify/shared/ui/badge';
import { PageHeader } from '../../layouts/dashboard/PageHeader';
import { WorkspaceState } from '../../components/WorkspaceState';
import { useChannels } from '../../context/ChannelContext';
import { editorStateFor } from './productEditorModel';
import { productEditorApi, type CatalogProduct } from './productEditorApi';

const copy = {
  en: { title: 'Products', description: 'Manage the same Store products and SKUs across marketplace, storefront, POS, and invoices.', add: 'Add product', imports: 'Import or export', search: 'Search products', empty: 'No products yet', emptyHelp: 'Add a simple product or build variants such as sizes and colors.', edit: 'Edit', archive: 'Archive', publish: 'Publish', draft: 'Make draft', visible: 'Marketplace visible', inherited: 'Store visibility', hidden: 'Marketplace hidden', stock: 'in stock', loading: 'Loading products…', forbidden: 'You do not have Product permission for this Store.', conflict: 'The product changed elsewhere. Refresh before trying again.', timeout: 'The request took too long. Refresh before retrying.', offline: 'You are offline. Reconnect and refresh.', error: 'Products could not be loaded. No changes were made.', retry: 'Try again' },
  kh: { title: 'ផលិតផល', description: 'គ្រប់គ្រងផលិតផល និង SKU ដូចគ្នារបស់ Store សម្រាប់ផ្សារ ហាងអនឡាញ POS និងវិក្កយបត្រ។', add: 'បន្ថែមផលិតផល', imports: 'នាំចូល ឬនាំចេញ', search: 'ស្វែងរកផលិតផល', empty: 'មិនទាន់មានផលិតផល', emptyHelp: 'បន្ថែមផលិតផលធម្មតា ឬបង្កើតវ៉ារ្យ៉ង់ដូចជាទំហំ និងពណ៌។', edit: 'កែសម្រួល', archive: 'ទុកក្នុងប័ណ្ណសារ', publish: 'បោះពុម្ពផ្សាយ', draft: 'ធ្វើជាសេចក្តីព្រាង', visible: 'បង្ហាញក្នុងផ្សារ', inherited: 'តាមការកំណត់ Store', hidden: 'លាក់ពីផ្សារ', stock: 'ក្នុងស្តុក', loading: 'កំពុងផ្ទុកផលិតផល…', forbidden: 'អ្នកមិនមានសិទ្ធិផលិតផលសម្រាប់ Store នេះទេ។', conflict: 'ផលិតផលត្រូវបានកែពីកន្លែងផ្សេង។ សូមផ្ទុកឡើងវិញមុនព្យាយាមម្តងទៀត។', timeout: 'សំណើចំណាយពេលយូរពេក។ សូមផ្ទុកឡើងវិញមុនព្យាយាម។', offline: 'អ្នកនៅក្រៅបណ្តាញ។ សូមភ្ជាប់វិញ និងផ្ទុកឡើងវិញ។', error: 'មិនអាចផ្ទុកផលិតផលបានទេ។ គ្មានការផ្លាស់ប្តូរត្រូវបានធ្វើ។', retry: 'ព្យាយាមម្តងទៀត' },
} as const;

type State = 'loading' | 'ready' | 'forbidden' | 'conflict' | 'timeout' | 'offline' | 'error';

export default function ProductCatalog() {
  const { language } = useTranslation();
  const text = copy[language === 'kh' ? 'kh' : 'en'];
  const navigate = useNavigate();
  const { store } = useChannels();
  const storeId = store?.storeId || store?.id;
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [state, setState] = useState<State>('loading');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    if (!storeId) return;
    setState('loading');
    try { setProducts(await productEditorApi.list(storeId)); setState('ready'); }
    catch (error) { setState(editorStateFor(error)); }
  }, [storeId]);
  useEffect(() => { void load(); }, [load]);

  const shown = useMemo(() => products.filter((product) =>
    product.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) ||
    product.ProductVariants?.some((variant) => variant.sku.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))), [products, query]);

  const changeStatus = async (product: CatalogProduct, status: 'draft' | 'active' | 'archived') => {
    setBusyId(product.id);
    try {
      await productEditorApi.update(storeId, product.id, { expectedVersion: product.version, status });
      await load();
    } catch (error) { setState(editorStateFor(error)); }
    finally { setBusyId(''); }
  };

  if (!storeId) return <WorkspaceState kind="empty" title={text.empty} description={text.emptyHelp} />;
  if (state !== 'ready') return <WorkspaceState kind={state} title={text[state]} actionLabel={state === 'loading' || state === 'forbidden' ? undefined : text.retry} onAction={state === 'loading' || state === 'forbidden' ? undefined : load} />;

  return (
    <div className="min-h-full">
      <PageHeader title={text.title} description={text.description} icon={Package} actions={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => navigate('/products/import')}><FileSpreadsheet className="mr-2 h-4 w-4" aria-hidden="true" />{text.imports}</Button><Button onClick={() => navigate('/products/create')}><Plus className="mr-2 h-4 w-4" aria-hidden="true" />{text.add}</Button></div>} />
      <main className="mx-auto max-w-[1400px] space-y-5 px-4 py-6 sm:px-6 md:px-8">
        <div className="flex gap-2"><Input aria-label={text.search} placeholder={text.search} value={query} onChange={(event) => setQuery(event.target.value)} className="max-w-md" /><Button type="button" size="icon" variant="outline" aria-label={text.retry} onClick={load}><RefreshCw className="h-4 w-4" aria-hidden="true" /></Button></div>
        {!shown.length ? <Card><CardContent className="p-8 text-center"><Package className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" /><h2 className="mt-3 font-semibold">{text.empty}</h2><p className="mt-1 text-sm text-muted-foreground">{text.emptyHelp}</p></CardContent></Card> : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
            <div role="table" aria-label={text.title} className="divide-y divide-border">
              {shown.map((product) => {
                const skuCount = product.ProductVariants?.length || 0;
                const stock = product.ProductVariants?.filter((variant) => variant.status === 'active').reduce((sum, variant) => sum + Number(variant.stockQuantity), 0) || 0;
                return <article role="row" key={product.id} className="grid gap-4 p-4 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:items-center">
                  <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-lg bg-muted">{product.images?.[0]?.url ? <img src={product.images[0].url} alt={product.images[0].alt || product.name} className="h-full w-full object-cover" onError={(event) => { event.currentTarget.hidden = true; }} /> : <Package className="h-5 w-5 text-muted-foreground" aria-hidden="true" />}</div>
                  <div className="min-w-0"><h2 className="truncate font-semibold">{product.name}</h2><p className="mt-1 text-sm text-muted-foreground">${product.ProductVariants?.[0]?.price || '0.00'} · {stock} {text.stock} · {skuCount} SKU</p><div className="mt-2 flex flex-wrap gap-2"><Badge variant={product.status === 'active' ? 'default' : 'subtle'}>{product.status}</Badge><Badge variant="outline">{product.marketplaceVisibility === true ? text.visible : product.marketplaceVisibility === false ? text.hidden : text.inherited}</Badge></div></div>
                  <div className="flex flex-wrap gap-2 sm:justify-end"><Button type="button" size="sm" variant="outline" onClick={() => navigate(`/products/edit/${product.id}`)}><Pencil className="mr-2 h-4 w-4" aria-hidden="true" />{text.edit}</Button><Button type="button" size="sm" variant="outline" disabled={busyId === product.id} onClick={() => changeStatus(product, product.status === 'active' ? 'draft' : 'active')}>{product.status === 'active' ? text.draft : text.publish}</Button><Button type="button" size="sm" variant="ghost" disabled={busyId === product.id || product.status === 'archived'} onClick={() => changeStatus(product, 'archived')}><Archive className="mr-2 h-4 w-4" aria-hidden="true" />{text.archive}</Button></div>
                </article>;
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
