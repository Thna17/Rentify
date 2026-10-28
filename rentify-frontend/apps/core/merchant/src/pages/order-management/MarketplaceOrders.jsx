import { useEffect, useRef, useState } from 'react';
import { PackageSearch, RefreshCw, CheckCircle2, Undo2 } from 'lucide-react';
import { ECOMMERCE_API_ROOT, RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { Button } from '@rentify/shared/ui/button';
import { Badge } from '@rentify/shared/ui/badge';
import { Checkbox } from '@rentify/shared/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@rentify/shared/ui/select';

const api = `${ECOMMERCE_API_ROOT}/api`;
const fieldClass = 'border-transparent [box-shadow:var(--shadow-soft)] bg-background';

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
        if (!id) throw new Error('Create a Store to manage COD orders.');
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs font-medium text-muted-foreground">Loading COD orders…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="max-w-[1400px] mx-auto px-4 py-6 sm:px-6 md:px-8 md:py-8 space-y-6 md:space-y-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-foreground">COD orders</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Deliver orders, collect cash directly, and record any refund.
            </p>
          </div>
          <Button
            type="button"
            disabled={!storeId || busy}
            onClick={() => load(storeId).catch((error) => setMessage(error.message))}
            className="h-10 border-transparent [box-shadow:var(--shadow-soft)] bg-card text-foreground hover:bg-muted/60"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {message && (
          <p role="status" className="rounded-xl bg-primary/[0.06] px-4 py-3 text-sm text-primary">
            {message}
          </p>
        )}

        {!orders.length && (
          <Card className="[box-shadow:var(--shadow-soft)] border-transparent">
            <CardContent className="p-16 flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <PackageSearch className="h-8 w-8 opacity-40" />
              <p className="text-sm">No COD orders yet.</p>
            </CardContent>
          </Card>
        )}

        {!!orders.length && (
          <div className="grid gap-5 lg:grid-cols-[minmax(14rem,1fr)_minmax(20rem,2fr)]">
            <div className="space-y-2">
              {orders.map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setSelectedId(order.id)}
                  className={`w-full rounded-xl border-transparent [box-shadow:var(--shadow-soft)] p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-colors ${
                    selectedId === order.id ? 'bg-primary/[0.08] text-primary' : 'bg-card hover:bg-muted/40'
                  }`}
                >
                  <strong className="block font-semibold">{order.orderNumber || order.id.slice(0, 8)}</strong>
                  <span className="text-sm text-muted-foreground">
                    {order.salesChannel === 'storefront' ? 'Storefront' : 'Marketplace'} · {order.customerInfo?.name} · ${order.totalAmount} · {order.deliveryStatus}
                  </span>
                </button>
              ))}
            </div>

            {selected && (
              <Card className="[box-shadow:var(--shadow-soft)] border-transparent">
                <CardContent className="p-6 space-y-5">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Order {selected.orderNumber || selected.id}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Delivery: {selected.deliveryStatus} · COD: {selected.payment?.status || 'unknown'}
                    </p>
                  </div>

                  <div className="grid gap-1.5 text-sm text-foreground">
                    <p>Buyer: {selected.customerInfo?.name} · {selected.customerInfo?.phone}</p>
                    <p>Address: {selected.shippingInfo?.address}</p>
                    {selected.items.map((item) => (
                      <p key={item.productId}>{item.quantity} × {item.name} · ${item.total}</p>
                    ))}
                    <p className="text-muted-foreground">Products: ${selected.subtotal} · Delivery: ${selected.deliveryFee}</p>
                    <p className="font-semibold">Cash due: ${selected.totalAmount}</p>
                    <p className="text-muted-foreground">
                      Collected: ${selected.payment?.collectedAmount || '0.00'} · Refunded: ${selected.payment?.refundedAmount || '0.00'}
                    </p>
                  </div>

                  {['pending', 'retrying'].includes(selected.deliveryStatus) && (
                    <div className="space-y-4 border-t border-border pt-5">
                      <Button type="button" disabled={busy} onClick={() => act('delivered')} className="h-10">
                        <CheckCircle2 className="h-4 w-4" />
                        Mark delivered
                      </Button>

                      <form onSubmit={(event) => { event.preventDefault(); act('delivery_failed', { reason, resolution }); }} className="grid gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="failed-reason">Failed delivery reason</Label>
                          <Input
                            id="failed-reason"
                            required
                            maxLength={500}
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            className={fieldClass}
                          />
                        </div>
                        <div className="space-y-1.5 w-fit">
                          <Label>Next step</Label>
                          <Select value={resolution} onValueChange={setResolution}>
                            <SelectTrigger className={`w-full h-9 ${fieldClass}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="retry">Wait for buyer-approved retry</SelectItem>
                              <SelectItem value="cancel">Cancel and restore stock</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="submit"
                          disabled={busy}
                          className="w-fit border-transparent [box-shadow:var(--shadow-soft)] bg-background text-foreground hover:bg-muted/60"
                        >
                          Record failed delivery
                        </Button>
                      </form>
                    </div>
                  )}

                  {selected.deliveryStatus === 'failed' && selected.status !== 'cancelled' && (
                    <div className="space-y-3 border-t border-border pt-5">
                      <label className="flex items-center gap-2 text-sm text-foreground">
                        <Checkbox checked={buyerAgreed} onCheckedChange={(value) => setBuyerAgreed(Boolean(value))} />
                        Buyer agreed to another delivery attempt
                      </label>
                      <Button
                        type="button"
                        disabled={busy || !buyerAgreed}
                        onClick={() => act('retry_delivery', { buyerAgreed: true })}
                        className="border-transparent [box-shadow:var(--shadow-soft)] bg-background text-foreground hover:bg-muted/60"
                      >
                        <Undo2 className="h-4 w-4" />
                        Retry delivery
                      </Button>
                    </div>
                  )}

                  {selected.deliveryStatus === 'delivered' && selected.payment?.status === 'pending' && (
                    <div className="border-t border-border pt-5">
                      <Button type="button" disabled={busy} onClick={() => act('collect_cod', { amount: selected.totalAmount })} className="h-10">
                        Confirm ${selected.totalAmount} cash collected
                      </Button>
                    </div>
                  )}

                  {selected.payment?.status === 'paid' && (
                    <form onSubmit={(event) => { event.preventDefault(); act('confirm_refund', refund); }} className="grid gap-3 border-t border-border pt-5">
                      <h4 className="text-sm font-semibold text-foreground">Record direct refund</h4>
                      <Input
                        required
                        type="number"
                        min="0.01"
                        max={Number(selected.payment.collectedAmount) - Number(selected.payment.refundedAmount)}
                        step="0.01"
                        placeholder="Amount (USD)"
                        value={refund.amount}
                        onChange={(event) => setRefund({ ...refund, amount: event.target.value })}
                        className={fieldClass}
                      />
                      <Input
                        required
                        maxLength={80}
                        placeholder="Refund method"
                        value={refund.method}
                        onChange={(event) => setRefund({ ...refund, method: event.target.value })}
                        className={fieldClass}
                      />
                      <Input
                        required
                        maxLength={500}
                        placeholder="Confirmation reference"
                        value={refund.confirmation}
                        onChange={(event) => setRefund({ ...refund, confirmation: event.target.value })}
                        className={fieldClass}
                      />
                      <Button
                        type="submit"
                        disabled={busy}
                        className="w-fit border-transparent [box-shadow:var(--shadow-soft)] bg-background text-foreground hover:bg-muted/60"
                      >
                        Confirm refund
                      </Button>
                    </form>
                  )}

                  <div className="border-t border-border pt-5">
                    <h4 className="text-sm font-semibold text-foreground">Activity</h4>
                    {!events.length && <p className="text-sm text-muted-foreground mt-2">No activity recorded yet.</p>}
                    {events.map((event) => (
                      <p key={event.id} className="mt-2 text-sm text-muted-foreground">
                        {event.type.replaceAll('_', ' ')} · {new Date(event.createdAt).toLocaleString()}
                        {event.details?.reason ? ` · ${event.details.reason}` : ''}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
