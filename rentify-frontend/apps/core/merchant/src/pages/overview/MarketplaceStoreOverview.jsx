import { useEffect, useState } from 'react';
import { MARKETING_URL, RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import StoreCatalogPage from '../product-management/StoreCatalogPage';
import MarketplaceOrders from '../order-management/MarketplaceOrders';

const base = `${RENTIFY_API_BASE}/api/stores`;

export default function MarketplaceStoreOverview({ initialStore, onStoreChange, onLogout }) {
  const [store, setStore] = useState(initialStore);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [categories, setCategories] = useState([]);
  const [primaryCategory, setPrimaryCategory] = useState(initialStore.primaryCategory || '');
  const [application, setApplication] = useState({
    responsibleName: '', pickupLocation: '', buyerContact: '', sampleProductDescription: '',
    acceptsDeliveryResponsibility: false, acceptsCodResponsibility: false,
    acceptsReturnsResponsibility: false, acceptsRefundResponsibility: false,
  });

  async function request(path, method, body) {
    const response = await fetch(`${base}${path}`, {
      method, credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || result.error || 'Request failed');
    return result.data;
  }

  useEffect(() => {
    request('/categories', 'GET')
      .then((result) => setCategories(Array.isArray(result) ? result : []))
      .catch(() => setMessage('Could not load Store categories. Refresh to retry.'));
    request('/mine/seller-application', 'GET')
      .then((result) => setApplicationStatus(result?.status || null))
      .catch(() => setMessage('Could not load seller review status. Refresh to retry.'));
  }, []);

  async function updatePrimaryCategory(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const updated = await request('/mine', 'PATCH', { primaryCategory });
      setStore(updated);
      onStoreChange(updated);
      setMessage(updated.marketplaceApprovalStatus === 'approved'
        ? 'Primary category saved. Your Store is approved for development marketplace listing.'
        : 'Primary category saved. Verify your account contact to complete development approval.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  async function updateMarketplaceEnabled() {
    setBusy(true);
    setMessage('');
    try {
      const updated = await request('/mine', 'PATCH', { marketplaceEnabled: !store.marketplaceEnabled });
      setStore(updated);
      onStoreChange(updated);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  async function submitApplication(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await request('/mine/seller-application', 'POST', application);
      setApplicationStatus('pending');
      setMessage('Application submitted. An admin will review your Store before marketplace sales begin.');
      const updated = await request('/mine', 'GET');
      setStore(updated);
      onStoreChange(updated);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  const canApply = Boolean(store.primaryCategory) &&
    !['pending', 'approved'].includes(applicationStatus) &&
    ['pending', 'needs_changes', 'rejected'].includes(store.marketplaceApprovalStatus);
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-sm font-semibold text-blue-700">Rentify marketplace</p>
            <h1 className="text-3xl font-bold">{store.name}</h1></div>
          <button onClick={onLogout} className="rounded-lg border px-4 py-2">Sign out</button>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">Primary category</p><p className="mt-2 font-semibold">{store.primaryCategory || 'Choose a category'}</p></div>
          <div className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">Marketplace approval</p><p className="mt-2 font-semibold capitalize">{store.marketplaceApprovalStatus.replace('_', ' ')}</p></div>
          <div className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">Pilot access</p><p className="mt-2 font-semibold">Free pilot</p></div>
        </div>
        <form onSubmit={updatePrimaryCategory} className="mt-6 rounded-xl border bg-white p-6">
          <label htmlFor="store-primary-category" className="block text-xl font-semibold">Store primary category</label>
          <p className="mt-2 text-slate-600">Choose the category that best describes your Store. Individual products can use more specific marketplace categories.</p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <select id="store-primary-category" required value={primaryCategory}
              onChange={(event) => setPrimaryCategory(event.target.value)}
              className="rounded-lg border px-3 py-2">
              <option value="">Choose a category</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <button disabled={busy || !primaryCategory || primaryCategory === store.primaryCategory}
              className="rounded-lg bg-blue-700 px-5 py-2 text-white disabled:opacity-50">Save category</button>
          </div>
        </form>
        <div className="mt-6 rounded-xl border bg-white p-6">
          <h2 className="text-xl font-semibold">Marketplace visibility</h2>
          <p className="mt-2 text-slate-600">Your Store is {store.marketplaceEnabled ? 'set to appear' : 'hidden'} in the marketplace when approved products are available.</p>
          <button disabled={busy} onClick={updateMarketplaceEnabled} className="mt-4 rounded-lg border px-4 py-2 disabled:opacity-50">
            {store.marketplaceEnabled ? 'Turn off marketplace visibility' : 'Turn on marketplace visibility'}
          </button>
        </div>
        <div className="mt-6 rounded-xl border bg-white p-6">
          <h2 className="text-xl font-semibold">Seller approval</h2>
          <p className="mt-2 text-slate-600">In development, a pending Store is approved after you choose a primary category and verify your account contact. You can add products now; public listings also need a product category, stock, and a posted delivery fee. Admin review remains available for other environments.</p>
          {applicationStatus === 'pending' && store.marketplaceApprovalStatus !== 'approved' &&
            <p className="mt-3 text-blue-800">Your application is waiting for admin review.</p>}
          {canApply && <form onSubmit={submitApplication} className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              ['responsibleName', 'Responsible person'], ['pickupLocation', 'Pickup or operating location'],
              ['buyerContact', 'Buyer contact'], ['sampleProductDescription', 'Sample product, price, and stock'],
            ].map(([key, label]) => <label key={key} className="text-sm font-medium">{label}
              <input required value={application[key]} onChange={(event) => setApplication({ ...application, [key]: event.target.value })}
                className="mt-1 block w-full rounded-lg border px-3 py-2" /></label>)}
            <div className="md:col-span-2 space-y-2">
              {[
                ['acceptsDeliveryResponsibility', 'I will deliver orders'],
                ['acceptsCodResponsibility', 'I will collect COD payments'],
                ['acceptsReturnsResponsibility', 'I will handle returns'],
                ['acceptsRefundResponsibility', 'I will issue confirmed refunds directly'],
              ].map(([key, label]) => <label key={key} className="flex gap-2 text-sm">
                <input type="checkbox" checked={application[key]} onChange={(event) => setApplication({ ...application, [key]: event.target.checked })} />{label}
              </label>)}
            </div>
            <button disabled={busy} className="rounded-lg bg-blue-700 px-5 py-3 text-white disabled:opacity-50">Submit for review</button>
          </form>}
        </div>
        <div className="mt-6 rounded-xl border bg-white p-6">
          <h2 className="text-xl font-semibold">Want your own storefront?</h2>
          <p className="mt-2 text-slate-600">Add a template and Website to this Store. Your Store identity stays the same.</p>
          <a href={`${MARKETING_URL}/pricing`} className="mt-4 inline-block rounded-lg border border-blue-700 px-5 py-3 text-blue-700">Explore storefront plans</a>
        </div>
        <div className="mt-6 rounded-xl border bg-white"><StoreCatalogPage storeId={store.id} /></div>
        <div className="mt-6 rounded-xl border bg-white"><MarketplaceOrders storeId={store.id} /></div>
        {message && <p role="status" className="mt-5 rounded-lg bg-blue-50 p-4 text-blue-900">{message}</p>}
      </div>
    </main>
  );
}
