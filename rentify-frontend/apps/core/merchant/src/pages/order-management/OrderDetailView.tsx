import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '@rentify/utils';
import {
  ArrowLeft,
  Phone,
  Send,
  Truck,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertCircle,
  Package,
  MapPin,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { Badge } from '@rentify/shared/ui/badge';
import { useChannels } from '../../context/ChannelContext';
import { ECOMMERCE_API_ROOT } from '@rentify/shared/config/urls';
import { RecordCashSheet } from './components/RecordCashSheet';

export function OrderDetailView() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { store } = useChannels();

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cashSheetOpen, setCashSheetOpen] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!store?.id || !id) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${ECOMMERCE_API_ROOT}/api/stores/${store.id}/orders/${id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Order not found');
      const data = await res.json();
      setOrder(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [store?.id, id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleAction = async (action: string, body = {}) => {
    if (!store?.id || !order?.id) return;
    setBusy(true);
    try {
      const res = await fetch(
        `${ECOMMERCE_API_ROOT}/api/stores/${store.id}/orders/${order.id}/actions/${action}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || errData?.message || 'Action failed');
      }
      await fetchOrder();
    } catch (err: any) {
      alert(err?.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center p-8">
        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground/60" />
          <span>Loading order…</span>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-destructive mb-2" />
        <h1 className="text-xl font-bold text-foreground">Order not found</h1>
        <p className="mt-1 text-sm text-muted-foreground">Could not load this order or it may have been deleted.</p>
        <Button variant="outline" onClick={() => navigate('/orders')} className="mt-4 rounded-xl">
          Back to Orders
        </Button>
      </div>
    );
  }

  const isKhqr = order.payment?.method === 'khqr' || order.payment?.status === 'paid';
  const isCod = order.payment?.method === 'cod' || order.payment?.codState !== 'none';
  const isDelivered = order.fulfillmentStatus === 'delivered';
  const isConfirmed = order.fulfillmentStatus === 'confirmed' || order.fulfillmentStatus === 'dispatched' || isDelivered;
  const isPaid = order.payment?.status === 'paid' || order.payment?.status === 'collected';
  const totalAmount = order.totals?.total || '0.00';
  const shippingFee = order.totals?.shipping || '0.00';

  const channelLabel = (channel: string) => {
    switch (channel) {
      case 'marketplace':
        return 'Marketplace';
      case 'storefront':
        return 'Online store';
      case 'pos':
        return 'POS';
      case 'invoice':
        return 'Invoice';
      default:
        return channel || 'Order';
    }
  };

  const buyerPhone = order.buyer?.phone || '';
  const cleanPhone = buyerPhone.replace(/[^0-9]/g, '');

  return (
    <div className="min-h-full pb-28 md:pb-12">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 md:px-8">
        {/* Back Link */}
        <div>
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Orders</span>
          </button>
        </div>

        {/* Header: Title + Channel Badge */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Order #{order.orderNumber || order.id.slice(0, 8)}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              Placed on {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">
            {channelLabel(order.channel)}
          </span>
        </div>

        {/* Paid by KHQR Notice Card (Screen M4b) */}
        {isKhqr && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 shadow-soft">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-foreground">Paid ${totalAmount} by KHQR</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Confirmed by CutLuy · Money settled to your merchant account · No cash to collect.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* "What happens next" Progress Steps Card (M4 & M4b) */}
        <div className="rounded-2xl border border-card-border bg-card p-5 shadow-soft space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider text-muted-foreground">
            What happens next
          </h2>

          <div className="space-y-4">
            {/* Step 1: Placed */}
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold mt-0.5">
                ✓
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {isKhqr ? 'Placed and paid' : 'Placed'}
                </p>
                <p className="text-xs text-muted-foreground">Order received with buyer details.</p>
              </div>
            </div>

            {/* Step 2: Confirm */}
            <div className="flex items-start gap-3">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold mt-0.5 ${
                  isConfirmed ? 'bg-emerald-500 text-white' : 'bg-primary text-primary-foreground animate-pulse'
                }`}
              >
                {isConfirmed ? '✓' : '2'}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Confirm the order</p>
                <p className="text-xs text-muted-foreground">
                  {isKhqr
                    ? 'The buyer has paid online. Confirm stock, then deliver. Nothing to collect.'
                    : 'Check stock, then confirm so the buyer knows their order is coming.'}
                </p>
              </div>
            </div>

            {/* Step 3: Deliver */}
            <div className="flex items-start gap-3">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold mt-0.5 ${
                  isDelivered ? 'bg-emerald-500 text-white' : isConfirmed ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {isDelivered ? '✓' : '3'}
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Deliver</p>
                <p className="text-xs text-muted-foreground">Package and dispatch the order to the buyer's address.</p>
              </div>
            </div>

            {/* Step 4: Collect cash (COD only) */}
            {!isKhqr && (
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold mt-0.5 ${
                    isPaid ? 'bg-emerald-500 text-white' : isDelivered ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isPaid ? '✓' : '4'}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">Collect cash on delivery</p>
                  <p className="text-xs text-muted-foreground">Collect ${totalAmount} when hand-delivering to buyer.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Buyer Information Card */}
        <div className="rounded-2xl border border-card-border bg-card p-5 shadow-soft space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider text-muted-foreground">
            Buyer
          </h2>
          <div>
            <p className="text-base font-semibold text-foreground">{order.buyer?.name || 'Customer'}</p>
            {buyerPhone && (
              <p className="text-sm text-muted-foreground mt-0.5">{buyerPhone}</p>
            )}
            {order.delivery && (order.delivery.street || order.delivery.province) && (
              <div className="flex items-start gap-2 mt-2 text-xs text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground/70 mt-0.5" />
                <span>
                  {[order.delivery.street, order.delivery.commune, order.delivery.district, order.delivery.province]
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>
            )}
          </div>

          {buyerPhone && (
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="rounded-xl h-9 px-3.5 text-xs font-semibold border-card-border"
              >
                <a href={`tel:${buyerPhone}`}>
                  <Phone className="mr-1.5 h-3.5 w-3.5" />
                  <span>Call</span>
                </a>
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="rounded-xl h-9 px-3.5 text-xs font-semibold border-card-border"
              >
                <a href={`https://t.me/+855${cleanPhone.replace(/^0/, '')}`} target="_blank" rel="noreferrer">
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  <span>Telegram</span>
                </a>
              </Button>
            </div>
          )}
        </div>

        {/* Items and Totals Card */}
        <div className="rounded-2xl border border-card-border bg-card p-5 shadow-soft space-y-4">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider text-muted-foreground">
            Items
          </h2>
          <div className="divide-y divide-border">
            {order.items?.map((item: any) => (
              <div key={item.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} × ${item.unitPrice}
                  </p>
                </div>
                <span className="font-bold font-mono text-foreground">${item.lineTotal}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between text-muted-foreground text-xs sm:text-sm">
              <span>Delivery fee</span>
              <span className="font-mono">${shippingFee}</span>
            </div>
            <div className="flex items-center justify-between font-bold text-base text-foreground pt-1 border-t border-border">
              <span>{isKhqr ? 'Total · paid by KHQR' : 'Total · cash on delivery'}</span>
              <span className="font-mono">${totalAmount}</span>
            </div>
          </div>
        </div>

        {/* If you can't fulfil it (DEC-029 note 2 on M4b) */}
        {isKhqr && (
          <div className="rounded-2xl border border-card-border bg-card p-5 shadow-soft space-y-3">
            <h2 className="text-sm font-semibold text-foreground">If you cannot fulfil this order</h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Paid orders cannot be refunded in Rentify yet (DEC-029), so there is no Cancel button here. If you need
              to cancel or make an adjustment, contact platform support.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/help')}
              className="rounded-xl h-9 px-4 text-xs font-semibold"
            >
              <HelpCircle className="mr-1.5 h-4 w-4" />
              <span>Get help</span>
            </Button>
          </div>
        )}

        {/* Timeline / History */}
        {order.timeline && order.timeline.length > 0 && (
          <div className="rounded-2xl border border-card-border bg-card p-5 shadow-soft space-y-3">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider text-muted-foreground">
              History
            </h2>
            <div className="space-y-3 text-xs">
              {order.timeline.map((evt: any, i: number) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold text-foreground capitalize">{evt.type?.replace(/_/g, ' ')}</span>
                    <span className="text-muted-foreground ml-2">
                      {new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar (Thumb Height on Phones) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          {/* Cancel button: COD only, never for KHQR paid orders (DEC-029) */}
          {!isKhqr && order.status !== 'cancelled' && !isDelivered && (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                if (confirm('Are you sure you want to cancel this order?')) {
                  handleAction('cancel', { reason: 'Merchant cancelled' });
                }
              }}
              className="h-12 rounded-xl px-4 text-xs sm:text-sm font-semibold text-destructive hover:bg-destructive/10"
            >
              Cancel order
            </Button>
          )}

          {/* Primary Action Button */}
          <div className="ml-auto flex items-center gap-2 w-full sm:w-auto">
            {!isConfirmed && (
              <Button
                disabled={busy}
                onClick={() => handleAction('confirm')}
                className="w-full sm:w-auto h-12 rounded-xl px-6 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Confirm order
              </Button>
            )}

            {isConfirmed && !isDelivered && (
              <Button
                disabled={busy}
                onClick={() => handleAction('dispatch')}
                className="w-full sm:w-auto h-12 rounded-xl px-6 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Mark out for delivery
              </Button>
            )}

            {isDelivered && !isPaid && !isKhqr && (
              <Button
                disabled={busy}
                onClick={() => setCashSheetOpen(true)}
                className="w-full sm:w-auto h-12 rounded-xl px-6 text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Record cash (${totalAmount})
              </Button>
            )}

            {(isPaid || order.status === 'completed') && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 px-3 py-2 bg-emerald-500/10 rounded-xl">
                Order complete
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Record Cash Sheet modal */}
      <RecordCashSheet
        open={cashSheetOpen}
        onOpenChange={setCashSheetOpen}
        order={order}
        onConfirm={async (amount) => {
          await handleAction('collect_cod', { amount });
          setCashSheetOpen(false);
        }}
      />
    </div>
  );
}

export default OrderDetailView;
