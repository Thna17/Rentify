import { useEffect, useState } from 'react';
import { RENTIFY_API_BASE } from '@rentify/shared/config/urls';

export default function StoreCategoryPrompt({ store, onStoreChange }) {
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`${RENTIFY_API_BASE}/api/stores/categories`, { credentials: 'include' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Categories unavailable')))
      .then((result) => setCategories(Array.isArray(result.data) ? result.data : []))
      .catch(() => setMessage('Could not load Store categories. Refresh to retry.'));
  }, []);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`${RENTIFY_API_BASE}/api/stores/mine`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryCategory: category }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Could not save category');
      onStoreChange(result.data);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  if (!store?.needsCategoryReview) return null;
  return <form onSubmit={save} className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
    <label htmlFor="website-store-category" className="block font-semibold">Choose your Store’s primary category</label>
    <p className="mt-1 text-sm">This lets Rentify classify your Store for marketplace listings. Your products can use more specific categories.</p>
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <select id="website-store-category" required value={category}
        onChange={(event) => setCategory(event.target.value)} className="rounded-lg border px-3 py-2">
        <option value="">Choose a category</option>
        {categories.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <button disabled={busy || !category} className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">Save category</button>
    </div>
    {message && <p role="status" className="mt-2 text-sm">{message}</p>}
  </form>;
}
