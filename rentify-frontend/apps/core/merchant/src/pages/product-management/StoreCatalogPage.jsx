import { useEffect, useState } from 'react';
import { ECOMMERCE_API_ROOT, RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import { ImageUploader } from '../product-form/components/ImageUploader';
import { uploadProductImages } from '../../services/productImages';

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
  const [deliveryPolicy, setDeliveryPolicy] = useState(null);
  const [deliveryFee, setDeliveryFee] = useState('');
  const [deliveryBusy, setDeliveryBusy] = useState(false);
  const [productImages, setProductImages] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageErrors, setImageErrors] = useState([]);
  const [form, setForm] = useState({
    name: '', description: '', price: '', stockQuantity: 0,
    marketplaceCategory: '', status: 'draft',
  });

  async function refresh(id) {
    const result = await getJson(`${commerce}/stores/${id}/products`);
    setProducts(result.products || []);
  }

  async function loadDelivery(id) {
    const result = await getJson(`${commerce}/stores/${id}/marketplace-delivery`);
    setDeliveryPolicy(result.policy);
    setDeliveryFee(result.policy?.flatFee ?? '');
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
      await Promise.all([refresh(storeResult.data.id), loadDelivery(storeResult.data.id)]);
    }).catch((error) => { if (active) setMessage(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [suppliedStoreId]);

  async function create(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const images = await uploadProductImages({
        files: productImages,
        storeId,
        onProgress: setUploadProgress,
      });
      await getJson(`${commerce}/stores/${storeId}/products`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form, price: Number(form.price), stockQuantity: Number(form.stockQuantity), images,
        }),
      });
      setForm({ name: '', description: '', price: '', stockQuantity: 0,
        marketplaceCategory: '', status: 'draft' });
      setProductImages([]);
      setImageErrors([]);
      await refresh(storeId);
      setMessage('Product saved to your Store catalog.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); setUploadProgress(0); }
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

  async function saveDeliveryFee(event) {
    event.preventDefault();
    const amount = Number(deliveryFee);
    if (!/^\d+(\.\d{1,2})?$/.test(deliveryFee.trim()) ||
        !Number.isFinite(amount) || amount > 1000) {
      setMessage('Enter a USD delivery fee from 0.00 to 1000.00 with at most two decimals.');
      return;
    }
    setDeliveryBusy(true);
    setMessage('');
    try {
      const result = await getJson(`${commerce}/stores/${storeId}/marketplace-delivery`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flatFee: amount.toFixed(2),
          ...(deliveryPolicy ? { expectedVersion: deliveryPolicy.version } : {}) }),
      });
      setDeliveryPolicy(result.policy);
      setDeliveryFee(result.policy.flatFee);
      setMessage('Marketplace delivery fee posted. Buyers will see it before checkout.');
    } catch (error) { setMessage(error.message); }
    finally { setDeliveryBusy(false); }
  }

  if (loading) return <div className="p-6">Loading catalog…</div>;
  return <section className="space-y-6 p-4 md:p-6">
    <div><h2 className="text-2xl font-bold">Store catalog</h2>
      <p className="text-sm text-slate-600">One product ID, price, and stock balance for your storefront and the marketplace.</p></div>
    <form onSubmit={saveDeliveryFee} className="rounded-xl border bg-white p-5">
      <h3 className="text-lg font-semibold">Marketplace delivery fee</h3>
      <p className="mt-1 text-sm text-slate-600">Post one flat fee per order. Buyers pay the shown fee with the product total on delivery. Enter 0 for free delivery.</p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">Delivery fee (USD)
          <input required type="number" min="0" max="1000" step="0.01" value={deliveryFee}
            onChange={(event) => setDeliveryFee(event.target.value)} className="mt-1 block w-40 rounded border px-3 py-2" />
        </label>
        <button disabled={deliveryBusy || !storeId} className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50">
          {deliveryBusy ? 'Saving…' : deliveryPolicy ? 'Update fee' : 'Post fee'}
        </button>
      </div>
      {!deliveryPolicy && <p className="mt-3 text-sm text-amber-700">Post a fee before your approved products appear in the marketplace.</p>}
    </form>
    <form onSubmit={create} className="grid gap-3 rounded-xl border bg-white p-5 md:grid-cols-2">
      <h3 className="text-lg font-semibold md:col-span-2">Add a product</h3>
      <label className="text-sm">Name<input required maxLength={200} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 block w-full rounded border px-3 py-2" /></label>
      <label className="text-sm">Marketplace category<select required value={form.marketplaceCategory} onChange={(event) => setForm({ ...form, marketplaceCategory: event.target.value })} className="mt-1 block w-full rounded border px-3 py-2"><option value="">Choose category</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
      <label className="text-sm">Price (USD)<input required type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="mt-1 block w-full rounded border px-3 py-2" /></label>
      <label className="text-sm">Stock<input required type="number" min="0" step="1" value={form.stockQuantity} onChange={(event) => setForm({ ...form, stockQuantity: event.target.value })} className="mt-1 block w-full rounded border px-3 py-2" /></label>
      <label className="text-sm md:col-span-2">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1 block w-full rounded border px-3 py-2" /></label>
      <div className="md:col-span-2">
        <p className="text-sm font-medium text-slate-900">Product images</p>
        <p className="mt-1 text-sm text-slate-600">Add up to 10 images. The first image becomes the cover.</p>
        <ImageUploader
          images={productImages}
          onImagesChange={(files) => setProductImages((current) => [...current, ...files])}
          onRemoveImage={(index) => setProductImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
          onValidationError={setImageErrors}
          isUploading={busy}
          uploadProgress={uploadProgress}
        />
        {imageErrors.length > 0 && (
          <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {imageErrors.map((error) => <p key={error}>{error}</p>)}
          </div>
        )}
      </div>
      <label className="text-sm">Publication<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="mt-1 block w-full rounded border px-3 py-2"><option value="draft">Draft</option><option value="active">Active</option></select></label>
      <button disabled={busy || !storeId} className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50">
        {busy ? (uploadProgress > 0 ? `Uploading ${uploadProgress}%…` : 'Saving…') : 'Save product'}
      </button>
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
