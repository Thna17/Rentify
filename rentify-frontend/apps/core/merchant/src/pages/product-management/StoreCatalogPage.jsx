import { useEffect, useState } from 'react';
import { ECOMMERCE_API_ROOT, RENTIFY_API_BASE } from '@rentify/shared/config/urls';

const commerce = `${ECOMMERCE_API_ROOT}/api`;

async function getJson(url, options = {}) {
  const response = await fetch(url, { credentials: 'include', ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
}

export default function StoreCatalogPage({ storeId: suppliedStoreId }) {
  const [storeId, setStoreId] = useState(suppliedStoreId || null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    name: '', description: '', price: '', stockQuantity: 0,
    marketplaceCategory: '', imageUrl: '', status: 'draft',
  });

  async function refresh(id) {
    const result = await getJson(`${commerce}/stores/${id}/products`);
    setProducts(result.products || []);
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      getJson(`${commerce}/marketplace/categories`),
      suppliedStoreId ? Promise.resolve({ data: { id: suppliedStoreId } })
        : getJson(`${RENTIFY_API_BASE}/api/stores/mine`),
    ]).then(async ([taxonomy, storeResult]) => {
      if (!active) return;
      setCategories(taxonomy.categories || []);
      setStoreId(storeResult.data.id);
      await refresh(storeResult.data.id);
    }).catch((error) => { if (active) setMessage(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [suppliedStoreId]);

  async function create(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await getJson(`${commerce}/stores/${storeId}/products`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form, price: Number(form.price), stockQuantity: Number(form.stockQuantity),
          images: form.imageUrl ? [{ url: form.imageUrl }] : [],
        }),
      });
      setForm({ name: '', description: '', price: '', stockQuantity: 0,
        marketplaceCategory: '', imageUrl: '', status: 'draft' });
      await refresh(storeId);
      setMessage('Product saved to your Store catalog.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  async function changeProduct(product, changes) {
    setBusy(true);
    setMessage('');
    try {
      await getJson(`${commerce}/stores/${storeId}/products/${product.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedVersion: product.version, ...changes }),
      });
      await refresh(storeId);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="p-6">Loading catalog…</div>;
  return <section className="space-y-6 p-4 md:p-6">
    <div><h2 className="text-2xl font-bold">Store catalog</h2>
      <p className="text-sm text-slate-600">One product ID, price, and stock balance for your storefront and the marketplace.</p></div>
    <form onSubmit={create} className="grid gap-3 rounded-xl border bg-white p-5 md:grid-cols-2">
      <h3 className="text-lg font-semibold md:col-span-2">Add a product</h3>
      <label className="text-sm">Name<input required maxLength={200} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 block w-full rounded border px-3 py-2" /></label>
      <label className="text-sm">Marketplace category<select required value={form.marketplaceCategory} onChange={(event) => setForm({ ...form, marketplaceCategory: event.target.value })} className="mt-1 block w-full rounded border px-3 py-2"><option value="">Choose category</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
      <label className="text-sm">Price (USD)<input required type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="mt-1 block w-full rounded border px-3 py-2" /></label>
      <label className="text-sm">Stock<input required type="number" min="0" step="1" value={form.stockQuantity} onChange={(event) => setForm({ ...form, stockQuantity: event.target.value })} className="mt-1 block w-full rounded border px-3 py-2" /></label>
      <label className="text-sm md:col-span-2">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1 block w-full rounded border px-3 py-2" /></label>
      <label className="text-sm md:col-span-2">Image HTTPS URL<input type="url" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} className="mt-1 block w-full rounded border px-3 py-2" /></label>
      <label className="text-sm">Publication<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="mt-1 block w-full rounded border px-3 py-2"><option value="draft">Draft</option><option value="active">Active</option></select></label>
      <button disabled={busy || !storeId} className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50">Save product</button>
    </form>
    <div className="rounded-xl border bg-white p-5">
      <h3 className="text-lg font-semibold">Your products</h3>
      {products.length === 0 && <p className="mt-3 text-slate-600">No products yet.</p>}
      <div className="mt-3 divide-y">{products.map((product) => <div key={product.id} className="flex flex-wrap items-center gap-3 py-3">
        <div className="min-w-44 flex-1"><p className="font-medium">{product.name}</p><p className="text-sm text-slate-600">${product.price} · Stock {product.stockQuantity} · {product.status}</p></div>
        <select aria-label={`Category for ${product.name}`} value={product.marketplaceCategory || ''}
          onChange={(event) => changeProduct(product, { marketplaceCategory: event.target.value })} className="rounded border px-2 py-1">
          <option value="">Choose category</option>{categories.map((category) => <option key={category}>{category}</option>)}
        </select>
        <button disabled={busy} onClick={() => changeProduct(product, { status: product.status === 'active' ? 'draft' : 'active' })} className="rounded border px-3 py-1">{product.status === 'active' ? 'Make draft' : 'Publish'}</button>
        <button disabled={busy} onClick={() => changeProduct(product, { marketplaceVisibility: product.marketplaceVisibility === false ? null : false })} className="rounded border px-3 py-1">{product.marketplaceVisibility === false ? 'Use Store visibility' : 'Hide from marketplace'}</button>
      </div>)}</div>
    </div>
    {message && <p role="status" className="rounded bg-blue-50 p-3 text-blue-900">{message}</p>}
  </section>;
}
