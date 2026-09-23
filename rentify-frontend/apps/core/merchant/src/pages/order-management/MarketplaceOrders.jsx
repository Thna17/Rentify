import { useEffect, useRef, useState } from 'react';
import { ECOMMERCE_API_ROOT, RENTIFY_API_BASE } from '@rentify/shared/config/urls';

const api = `${ECOMMERCE_API_ROOT}/api`;

async function request(url, options = {}) {
  const response = await fetch(url, { credentials: 'include', ...options });
  const result = await response.json();
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : result.message || 'Request failed');
  return result;
}

export default function MarketplaceOrders({ storeId: suppliedStoreId }) {
  const [storeId, setStoreId] = useState(suppliedStoreId || null);
  const [orders, setOrders] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');
  const [resolution, setResolution] = useState('retry');
  const [buyerAgreed, setBuyerAgreed] = useState(false);
  const [refund, setRefund] = useState({ amount: '', method: '', confirmation: '' });
  const retry = useRef(null);
  const selected = orders.find((order) => order.id === selectedId);

  async function load(id) {
    const result = await request(`${api}/stores/${id}/marketplace-orders`);
    setOrders(result.orders || []);
    setSelectedId((previous) => previous && result.orders.some((order) => order.id === previous)
      ? previous : result.orders[0]?.id || null);
  }

  useEffect(() => {
    let active = true;
    async function start() {
      try {
        const id = suppliedStoreId || (await request(`${RENTIFY_API_BASE}/api/stores/mine`)).data?.id;
        if (!id) throw new Error('Create a Store to manage marketplace orders.');
        if (!active) return;
        setStoreId(id);
        await load(id);
      } catch (error) { if (active) setMessage(error.message); }
      finally { if (active) setLoading(false); }
    }
    start();
    return () => { active = false; };
  }, [suppliedStoreId]);

  useEffect(() => {
    if (!storeId || !selectedId) { setEvents([]); return; }
    let active = true;
    request(`${api}/stores/${storeId}/marketplace-orders/${selectedId}/events`)
      .then((result) => { if (active) setEvents(result.events || []); })
      .catch((error) => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [storeId, selectedId]);

  async function act(action, details = {}) {
    if (!selected || busy) return;
    const fingerprint = JSON.stringify([selected.id, action, details]);
    const key = retry.current?.fingerprint === fingerprint ? retry.current.key : crypto.randomUUID();
    retry.current = { fingerprint, key };
    setBusy(true);
    setMessage('');
    try {
      await request(`${api}/stores/${storeId}/marketplace-orders/${selected.id}/actions/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify(details),
      });
      retry.current = null;
      await load(storeId);
      const result = await request(`${api}/stores/${storeId}/marketplace-orders/${selected.id}/events`);
      setEvents(result.events || []);
      setReason('');
      setBuyerAgreed(false);
      setRefund({ amount: '', method: '', confirmation: '' });
      setMessage('Order updated.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="p-6">Loading marketplace orders…</div>;
  return <section className="space-y-5 p-4 md:p-6">
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="text-2xl font-bold">Marketplace orders</h2>
        <p className="text-sm text-slate-600">Deliver orders, collect cash directly, and record any refund.</p></div>
      <button type="button" disabled={!storeId || busy} onClick={() => load(storeId).catch((error) => setMessage(error.message))}
        className="rounded border px-3 py-2 text-sm">Refresh</button>
    </div>
    {message && <p role="status" className="rounded bg-blue-50 p-3 text-sm text-blue-900">{message}</p>}
    {!orders.length && <p className="rounded border bg-white p-5">No marketplace orders yet.</p>}
    {!!orders.length && <div className="grid gap-5 lg:grid-cols-[minmax(14rem,1fr)_minmax(20rem,2fr)]">
      <div className="space-y-2">
        {orders.map((order) => <button key={order.id} type="button" onClick={() => setSelectedId(order.id)}
          className={`w-full rounded-lg border p-4 text-left ${selectedId === order.id ? 'border-blue-600 bg-blue-50' : 'bg-white'}`}>
          <strong className="block">{order.orderNumber || order.id.slice(0, 8)}</strong>
          <span className="text-sm">{order.customerInfo?.name} · ${order.totalAmount} · {order.deliveryStatus}</span>
        </button>)}
      </div>
      {selected && <div className="space-y-5 rounded-xl border bg-white p-5">
        <div><h3 className="text-lg font-semibold">Order {selected.orderNumber || selected.id}</h3>
          <p className="text-sm">Delivery: {selected.deliveryStatus} · COD: {selected.payment?.status || 'unknown'}</p></div>
        <div className="grid gap-1 text-sm">
          <p>Buyer: {selected.customerInfo?.name} · {selected.customerInfo?.phone}</p>
          <p>Address: {selected.shippingInfo?.address}</p>
          {selected.items.map((item) => <p key={item.productId}>{item.quantity} × {item.name} · ${item.total}</p>)}
          <p>Products: ${selected.subtotal} · Delivery: ${selected.deliveryFee}</p>
          <p className="font-semibold">Cash due: ${selected.totalAmount}</p>
          <p>Collected: ${selected.payment?.collectedAmount || '0.00'} · Refunded: ${selected.payment?.refundedAmount || '0.00'}</p>
        </div>
        {['pending', 'retrying'].includes(selected.deliveryStatus) && <div className="space-y-3 border-t pt-4">
          <button type="button" disabled={busy} onClick={() => act('delivered')}
            className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50">Mark delivered</button>
          <form onSubmit={(event) => { event.preventDefault(); act('delivery_failed', { reason, resolution }); }} className="grid gap-2">
            <label className="text-sm">Failed delivery reason<input required maxLength={500} value={reason}
              onChange={(event) => setReason(event.target.value)} className="mt-1 block w-full rounded border px-3 py-2" /></label>
            <label className="text-sm">Next step<select value={resolution} onChange={(event) => setResolution(event.target.value)}
              className="ml-2 rounded border px-2 py-1"><option value="retry">Wait for buyer-approved retry</option>
              <option value="cancel">Cancel and restore stock</option></select></label>
            <button disabled={busy} className="w-fit rounded border px-4 py-2 disabled:opacity-50">Record failed delivery</button>
          </form>
        </div>}
        {selected.deliveryStatus === 'failed' && selected.status !== 'cancelled' && <div className="space-y-2 border-t pt-4">
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={buyerAgreed}
            onChange={(event) => setBuyerAgreed(event.target.checked)} />Buyer agreed to another delivery attempt</label>
          <button type="button" disabled={busy || !buyerAgreed} onClick={() => act('retry_delivery', { buyerAgreed: true })}
            className="rounded border px-4 py-2 disabled:opacity-50">Retry delivery</button>
        </div>}
        {selected.deliveryStatus === 'delivered' && selected.payment?.status === 'pending' && <div className="border-t pt-4">
          <button type="button" disabled={busy} onClick={() => act('collect_cod', { amount: selected.totalAmount })}
            className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50">Confirm ${selected.totalAmount} cash collected</button>
        </div>}
        {selected.payment?.status === 'paid' && <form onSubmit={(event) => { event.preventDefault(); act('confirm_refund', refund); }}
          className="grid gap-2 border-t pt-4">
          <h4 className="font-semibold">Record direct refund</h4>
          <input required type="number" min="0.01" max={Number(selected.payment.collectedAmount) - Number(selected.payment.refundedAmount)}
            step="0.01" placeholder="Amount (USD)" value={refund.amount}
            onChange={(event) => setRefund({ ...refund, amount: event.target.value })} className="rounded border px-3 py-2" />
          <input required maxLength={80} placeholder="Refund method" value={refund.method}
            onChange={(event) => setRefund({ ...refund, method: event.target.value })} className="rounded border px-3 py-2" />
          <input required maxLength={500} placeholder="Confirmation reference" value={refund.confirmation}
            onChange={(event) => setRefund({ ...refund, confirmation: event.target.value })} className="rounded border px-3 py-2" />
          <button disabled={busy} className="w-fit rounded border px-4 py-2 disabled:opacity-50">Confirm refund</button>
        </form>}
        <div className="border-t pt-4"><h4 className="font-semibold">Activity</h4>
          {!events.length && <p className="text-sm text-slate-500">No activity recorded yet.</p>}
          {events.map((event) => <p key={event.id} className="mt-2 text-sm">
            {event.type.replaceAll('_', ' ')} · {new Date(event.createdAt).toLocaleString()}
            {event.details?.reason ? ` · ${event.details.reason}` : ''}
          </p>)}
        </div>
      </div>}
    </div>}
  </section>;
}
