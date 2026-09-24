import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AUTH_URL, DASHBOARD_URL, RENTIFY_API_BASE } from '@rentify/shared/config/urls';

const storeUrl = `${RENTIFY_API_BASE}/api/stores`;

export default function StartSelling() {
  const [categories, setCategories] = useState([]);
  const [existingStore, setExistingStore] = useState(null);
  const [name, setName] = useState('');
  const [primaryCategory, setPrimaryCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`${storeUrl}/categories`).then((response) => response.json()),
      fetch(`${storeUrl}/mine`, { credentials: 'include' }).then((response) =>
        response.ok ? response.json() : null),
    ]).then(([categoryResult, storeResult]) => {
      if (!active) return;
      setCategories(categoryResult.data || []);
      setExistingStore(storeResult?.data || null);
    }).catch(() => {
      if (active) setMessage('We could not load the store options. Please refresh and try again.');
    });
    return () => { active = false; };
  }, []);

  async function createMarketplaceStore(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const response = await fetch(storeUrl, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, primaryCategory, marketplaceEnabled: true }),
      });
      if (response.status === 401) {
        setMessage('Sign in or create your Rentify account, then return here.');
        return;
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || result.error || 'Could not create Store');
      window.location.assign(`${DASHBOARD_URL}/overview`);
    } catch (error) {
      setMessage(error.message || 'Could not create Store');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <Link to="/" className="text-xl font-bold text-blue-700">Rentify</Link>
        <h1 className="mt-10 text-3xl font-bold">How would you like to sell?</h1>
        <p className="mt-2 text-slate-600">One Rentify account and one Store. You can add a storefront later.</p>
        {existingStore ? (
          <div className="mt-8 rounded-xl border bg-white p-6">
            <h2 className="text-xl font-semibold">Your Store: {existingStore.name}</h2>
            <p className="mt-2 text-slate-600">Category: {existingStore.primaryCategory || 'Needs review'}</p>
            <div className="mt-5 flex gap-4">
              <a href={`${DASHBOARD_URL}/overview`} className="rounded-lg bg-blue-700 px-5 py-3 text-white">Open dashboard</a>
              <Link to="/pricing" className="rounded-lg border px-5 py-3">Add a storefront</Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <section className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Sell in the marketplace</h2>
              <p className="mt-2 text-sm text-slate-600">Start with a free pilot Store. Marketplace sales begin after seller approval.</p>
              <form onSubmit={createMarketplaceStore} className="mt-6 space-y-4">
                <label className="block text-sm font-medium">Store name
                  <input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)}
                    className="mt-1 w-full rounded-lg border px-3 py-2" />
                </label>
                <label className="block text-sm font-medium">Primary category
                  <select required value={primaryCategory} onChange={(event) => setPrimaryCategory(event.target.value)}
                    className="mt-1 w-full rounded-lg border px-3 py-2">
                    <option value="">Choose a category</option>
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </label>
                <button disabled={submitting || !categories.length} className="rounded-lg bg-blue-700 px-5 py-3 text-white disabled:opacity-50">
                  {submitting ? 'Creating Store…' : 'Create marketplace Store'}
                </button>
              </form>
              <p className="mt-4 text-sm text-slate-600">Already registered? <a href={AUTH_URL} className="text-blue-700 underline">Sign in</a>, then return to this page.</p>
            </section>
            <section className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Create a storefront</h2>
              <p className="mt-2 text-sm text-slate-600">Choose a template, customize your site, and list eligible products in the marketplace by default.</p>
              <Link to="/pricing" className="mt-6 inline-block rounded-lg border border-blue-700 px-5 py-3 text-blue-700">Choose a storefront plan</Link>
            </section>
          </div>
        )}
        {message && <p role="alert" className="mt-6 rounded-lg bg-amber-50 p-4 text-amber-900">{message}</p>}
      </div>
    </main>
  );
}
