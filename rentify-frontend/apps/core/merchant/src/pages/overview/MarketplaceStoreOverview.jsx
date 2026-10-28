import { useEffect, useState } from 'react';
import { MARKETING_URL, RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import { useChannels } from '../../context/ChannelContext';
import { emitActivation } from './launchChecklistModel';
import { useTranslation } from '@rentify/utils';

const base = `${RENTIFY_API_BASE}/api/stores`;

export default function MarketplaceStoreOverview({ initialStore, onStoreChange, onLogout }) {
  const { language } = useTranslation();
  const tr = (english, khmer) => language === 'kh' ? khmer : english;
  const channels = useChannels();
  const sourceStore = initialStore || channels.store || {};
  const notifyStoreChange = onStoreChange || channels.setStore;
  const [store, setStore] = useState(sourceStore);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [categories, setCategories] = useState([]);
  const [primaryCategory, setPrimaryCategory] = useState(sourceStore.primaryCategory || '');
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
      .catch(() => setMessage(tr('Could not load Store categories. Refresh to retry.', 'មិនអាចផ្ទុកប្រភេទហាងបានទេ។ សូមផ្ទុកឡើងវិញ។')));
    request('/mine/seller-application', 'GET')
      .then((result) => setApplicationStatus(result?.status || null))
      .catch(() => setMessage(tr('Could not load seller review status. Refresh to retry.', 'មិនអាចផ្ទុកស្ថានភាពពិនិត្យអ្នកលក់បានទេ។ សូមផ្ទុកឡើងវិញ។')));
  }, []);

  useEffect(() => {
    if (sourceStore?.id) {
      setStore(sourceStore);
      setPrimaryCategory(sourceStore.primaryCategory || '');
    }
  }, [sourceStore?.id]);

  async function updatePrimaryCategory(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const updated = await request('/mine', 'PATCH', { primaryCategory });
      setStore(updated);
      notifyStoreChange(updated);
      emitActivation('launch_category_saved', { approvalStatus: updated.marketplaceApprovalStatus || 'unknown' });
      setMessage(tr('Primary category saved. Refresh the checklist to see the latest status.', 'បានរក្សាទុកប្រភេទចម្បង។ សូមពិនិត្យបញ្ជីឡើងវិញ ដើម្បីមើលស្ថានភាពថ្មី។'));
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  async function updateMarketplaceEnabled() {
    setBusy(true);
    setMessage('');
    try {
      const updated = await request('/mine', 'PATCH', { marketplaceEnabled: !store.marketplaceEnabled });
      setStore(updated);
      notifyStoreChange(updated);
      emitActivation('launch_marketplace_visibility_changed', { enabled: Boolean(updated.marketplaceEnabled) });
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
      emitActivation('launch_seller_application_submitted', { result: 'pending' });
      setMessage(tr('Application submitted. Rentify will review your Store before marketplace sales begin.', 'បានដាក់ស្នើពាក្យសុំ។ Rentify នឹងពិនិត្យហាង មុនចាប់ផ្តើមលក់នៅទីផ្សាររួម។'));
      const updated = await request('/mine', 'GET');
      setStore(updated);
      notifyStoreChange(updated);
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  const canApply = Boolean(store?.primaryCategory) &&
    !['pending', 'approved'].includes(applicationStatus) &&
    ['pending', 'needs_changes', 'rejected'].includes(store?.marketplaceApprovalStatus);
  const approvalLabel = language === 'kh' ? {
    pending: 'កំពុងរង់ចាំ', approved: 'បានអនុម័ត', needs_changes: 'ត្រូវការកែប្រែ', rejected: 'បានបដិសេធ', suspended: 'បានផ្អាក',
  }[store?.marketplaceApprovalStatus] : store?.marketplaceApprovalStatus?.replace('_', ' ');
  if (!store?.id) return <div role="status" className="p-6 text-sm text-muted-foreground">{tr('Loading Store readiness…', 'កំពុងផ្ទុកភាពត្រៀមរួចរបស់ហាង…')}</div>;
  return (
    <div className="px-4 py-8 text-foreground sm:px-6 md:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><p className="text-sm font-semibold text-blue-700">{tr('Rentify marketplace', 'ទីផ្សាររួម Rentify')}</p>
            <h1 className="text-3xl font-bold">{store.name}</h1></div>
          {onLogout && <button onClick={onLogout} className="rounded-lg border px-4 py-2">{tr('Sign out', 'ចាកចេញ')}</button>}
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">{tr('Primary category', 'ប្រភេទចម្បង')}</p><p className="mt-2 font-semibold">{store.primaryCategory || tr('Choose a category', 'ជ្រើសរើសប្រភេទ')}</p></div>
          <div className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">{tr('Marketplace approval', 'ការអនុម័តទីផ្សាររួម')}</p><p className="mt-2 font-semibold capitalize">{approvalLabel}</p></div>
          <div className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">{tr('Marketplace visibility', 'ការបង្ហាញនៅទីផ្សាររួម')}</p><p className="mt-2 font-semibold">{store.marketplaceEnabled ? tr('Enabled', 'បានបើក') : tr('Disabled', 'បានបិទ')}</p></div>
        </div>
        <form onSubmit={updatePrimaryCategory} className="mt-6 rounded-xl border bg-white p-6">
          <label htmlFor="store-primary-category" className="block text-xl font-semibold">{tr('Store primary category', 'ប្រភេទចម្បងរបស់ហាង')}</label>
          <p className="mt-2 text-slate-600">{tr('Choose the category that best describes your Store. Individual Products can use more specific marketplace categories.', 'ជ្រើសរើសប្រភេទដែលពិពណ៌នាហាងរបស់អ្នកបានល្អបំផុត។ ផលិតផលនីមួយៗអាចប្រើប្រភេទលម្អិតជាងនេះ។')}</p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <select id="store-primary-category" required value={primaryCategory}
              onChange={(event) => setPrimaryCategory(event.target.value)}
              className="rounded-lg border px-3 py-2">
              <option value="">{tr('Choose a category', 'ជ្រើសរើសប្រភេទ')}</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <button disabled={busy || !primaryCategory || primaryCategory === store.primaryCategory}
              className="rounded-lg bg-blue-700 px-5 py-2 text-white disabled:opacity-50">{tr('Save category', 'រក្សាទុកប្រភេទ')}</button>
          </div>
        </form>
        <div className="mt-6 rounded-xl border bg-white p-6">
          <h2 className="text-xl font-semibold">{tr('Marketplace visibility', 'ការបង្ហាញនៅទីផ្សាររួម')}</h2>
          <p className="mt-2 text-slate-600">{store.marketplaceEnabled ? tr('Your Store will appear when approved Products are available.', 'ហាងរបស់អ្នកនឹងបង្ហាញ នៅពេលមានផលិតផលដែលបានអនុម័ត។') : tr('Your Store is hidden from the marketplace.', 'ហាងរបស់អ្នកត្រូវបានលាក់ពីទីផ្សាររួម។')}</p>
          <button disabled={busy} onClick={updateMarketplaceEnabled} className="mt-4 rounded-lg border px-4 py-2 disabled:opacity-50">
            {store.marketplaceEnabled ? tr('Turn off marketplace visibility', 'បិទការបង្ហាញនៅទីផ្សាររួម') : tr('Turn on marketplace visibility', 'បើកការបង្ហាញនៅទីផ្សាររួម')}
          </button>
        </div>
        <div className="mt-6 rounded-xl border bg-white p-6">
          <h2 className="text-xl font-semibold">{tr('Seller approval', 'ការអនុម័តអ្នកលក់')}</h2>
          <p className="mt-2 text-slate-600">{tr('Rentify reviews your Store, verified contact, Products, policies, and seller commitments before marketplace sales begin.', 'Rentify ពិនិត្យហាង ទំនាក់ទំនងដែលបានផ្ទៀងផ្ទាត់ ផលិតផល គោលការណ៍ និងការទទួលខុសត្រូវរបស់អ្នកលក់ មុនចាប់ផ្តើមលក់។')}</p>
          {applicationStatus === 'pending' && store.marketplaceApprovalStatus !== 'approved' &&
            <p className="mt-3 text-blue-800">{tr('Your application is waiting for review.', 'ពាក្យស្នើសុំរបស់អ្នកកំពុងរង់ចាំការពិនិត្យ។')}</p>}
          {canApply && <form onSubmit={submitApplication} className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              ['responsibleName', tr('Responsible person', 'អ្នកទទួលខុសត្រូវ')], ['pickupLocation', tr('Pickup or operating location', 'ទីតាំងយកទំនិញ ឬប្រតិបត្តិការ')],
              ['buyerContact', tr('Buyer contact', 'ទំនាក់ទំនងសម្រាប់អតិថិជន')], ['sampleProductDescription', tr('Sample Product, price, and stock', 'គំរូផលិតផល តម្លៃ និងស្តុក')],
            ].map(([key, label]) => <label key={key} className="text-sm font-medium">{label}
              <input required value={application[key]} onChange={(event) => setApplication({ ...application, [key]: event.target.value })}
                className="mt-1 block w-full rounded-lg border px-3 py-2" /></label>)}
            <div className="md:col-span-2 space-y-2">
              {[
                ['acceptsDeliveryResponsibility', tr('I will deliver orders', 'ខ្ញុំនឹងដឹកជញ្ជូនការបញ្ជាទិញ')],
                ['acceptsCodResponsibility', tr('I will collect COD payments', 'ខ្ញុំនឹងប្រមូលប្រាក់ COD')],
                ['acceptsReturnsResponsibility', tr('I will handle returns', 'ខ្ញុំនឹងដោះស្រាយការប្រគល់ទំនិញ')],
                ['acceptsRefundResponsibility', tr('I will issue confirmed refunds directly', 'ខ្ញុំនឹងសងប្រាក់ដែលបានបញ្ជាក់ដោយផ្ទាល់')],
              ].map(([key, label]) => <label key={key} className="flex gap-2 text-sm">
                <input type="checkbox" checked={application[key]} onChange={(event) => setApplication({ ...application, [key]: event.target.checked })} />{label}
              </label>)}
            </div>
            <button disabled={busy} className="rounded-lg bg-blue-700 px-5 py-3 text-white disabled:opacity-50">{tr('Submit for review', 'ដាក់ស្នើដើម្បីពិនិត្យ')}</button>
          </form>}
        </div>
        <div className="mt-6 rounded-xl border bg-white p-6">
          <h2 className="text-xl font-semibold">{tr('Want your own storefront?', 'ចង់មានហាងអនឡាញផ្ទាល់ខ្លួន?')}</h2>
          <p className="mt-2 text-slate-600">{tr('Add a template and Website to this Store. Your Store identity and Product data stay the same.', 'បន្ថែមគំរូ និង Website ទៅ Store នេះ។ អត្តសញ្ញាណ Store និងទិន្នន័យ Product របស់អ្នកនៅដដែល។')}</p>
          <a href={`${MARKETING_URL}/pricing`} className="mt-4 inline-block rounded-lg border border-blue-700 px-5 py-3 text-blue-700">{tr('Explore storefront plans', 'មើលគម្រោងហាងអនឡាញ')}</a>
        </div>
        {message && <p role="status" className="mt-5 rounded-lg bg-blue-50 p-4 text-blue-900">{message}</p>}
      </div>
    </div>
  );
}
