import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { ECOMMERCE_API_ROOT } from '@rentify/shared/config/urls';
import { useStorefrontWebsite } from '../website';
import { hostedCheckoutUrl, hostedRequest } from '../hostedBuyer';
import { formatMoney } from '../commerce';

export const HostedBuyerOrders = ({ single = false }) => {
  const { websiteId } = useStorefrontWebsite();
  const { orderId, id } = useParams();
  const selectedId = orderId || id;
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(() => {
    if (!websiteId) return;
    setLoading(true);
    setError('');
    const path = single ? `/my-orders/${encodeURIComponent(selectedId)}` : '/my-orders';
    hostedRequest(hostedCheckoutUrl(websiteId, path))
      .then((data) => {
        setOrders(single ? (data.order ? [data.order] : []) : data.orders || []);
      })
      .catch((caught) => setError(caught.message))
      .finally(() => setLoading(false));
  }, [websiteId, selectedId, single]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Real-time status polling for pending KHQR orders in single-order view
  useEffect(() => {
    if (!single || !orders.length) return;
    const order = orders[0];
    const payment = order?.payment;
    const paymentMethod = String(payment?.paymentMethod || payment?.method || order?.metadata?.paymentMethod || '').toUpperCase();
    const isKhqr = ['KHQR', 'CUTLUY'].includes(paymentMethod);
    const isPaid = ['paid', 'completed'].includes(payment?.status);

    if (!isKhqr || isPaid || !payment?.id) return;

    let active = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${ECOMMERCE_API_ROOT}/api/payment/payments/${encodeURIComponent(payment.id)}/check-status`, {
          credentials: 'include',
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.status === 'paid' || data?.status === 'completed') {
          if (active) fetchOrders();
        }
      } catch (e) {
        // ignore polling errors
      }
    }, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [single, orders, fetchOrders]);

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-10" aria-busy={loading}>
      <h1 className="text-2xl font-semibold">{single ? 'Order confirmation' : 'My orders'}</h1>
      {loading && (
        <div role="status" className="space-y-3">
          <div className="h-28 animate-pulse rounded-xl bg-muted" />
          <p className="sr-only">Loading orders…</p>
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-lg bg-error/10 p-4 text-sm text-error">
          <p>{error}</p>
          <button type="button" onClick={fetchOrders} className="mt-2 font-medium underline">
            Try again
          </button>
        </div>
      )}
      {!loading && !error && orders.length === 0 && <p className="text-muted-foreground">No orders yet.</p>}
      {orders.filter(Boolean).map((order) => {
        const currency = order.currency || 'USD';
        const payment = order.payment;
        const paymentMethod = String(payment?.paymentMethod || payment?.method || order.metadata?.paymentMethod || 'COD').toUpperCase();
        const isKhqr = ['KHQR', 'CUTLUY'].includes(paymentMethod);
        const paymentStatus = payment?.status || 'pending';
        const isPaid = ['paid', 'completed'].includes(paymentStatus);

        return (
          <section key={order.id} className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm">
            <div className="flex flex-wrap justify-between gap-3 items-start">
              <div>
                <p className="font-semibold text-foreground text-lg">Order {order.orderNumber || order.id}</p>
                <p className="text-sm text-muted-foreground">
                  {order.salesChannel === 'storefront' ? 'Storefront' : 'Marketplace'} · {order.deliveryStatus || order.status}
                </p>
              </div>
              <div className="text-right">
                <strong className="text-foreground text-lg block tabular-nums">
                  {formatMoney(order.totalAmount, currency)}
                </strong>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold mt-1 ${isPaid ? 'bg-success/15 text-success' : isKhqr ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground'}`}>
                  {isPaid ? 'Paid' : isKhqr ? 'Pending KHQR Payment' : 'Cash on delivery'}
                </span>
              </div>
            </div>

            {single && isKhqr && (
              <div className="mt-5 rounded-xl border border-border bg-muted/20 p-5 sm:p-6">
                {isPaid ? (
                  <div className="flex items-center gap-3 text-success">
                    <CheckCircle2 className="h-8 w-8 shrink-0" aria-hidden="true" />
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Payment Received</h3>
                      <p className="text-sm text-muted-foreground">Your KHQR payment has been confirmed. Your order is being prepared!</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Scan with KHQR Banking App</h3>
                      <p className="text-sm text-muted-foreground">Use ABA Mobile, Bakong, Wing, ACLEDA, or any KHQR-supported app to scan and pay.</p>
                    </div>
                    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start pt-2">
                      {payment?.rawQR ? (
                        <div className="rounded-2xl border-2 border-border bg-white p-3.5 shadow-md inline-block">
                          <QRCodeSVG value={payment.rawQR} size={220} level="M" marginSize={1} />
                        </div>
                      ) : null}
                      <div className="w-full space-y-3.5 text-center sm:text-left">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount Due</p>
                          <p className="text-3xl font-bold tabular-nums text-foreground">{formatMoney(payment?.amount || order.totalAmount, currency)}</p>
                        </div>
                        {payment?.qrCodeUrl && (
                          <div className="pt-1">
                            <a
                              href={payment.qrCodeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm"
                            >
                              Open in Banking App
                              <ExternalLink className="h-4 w-4" aria-hidden="true" />
                            </a>
                          </div>
                        )}
                        <div role="status" className="flex items-center justify-center sm:justify-start gap-2 text-xs font-medium text-muted-foreground pt-1">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                          <span>Listening for payment settlement in real time...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {single && (
              <>
                <ul className="mt-5 space-y-2 border-t border-border pt-4">
                  {(order.items || []).map((item) => (
                    <li key={item.productId} className="flex justify-between text-sm py-1">
                      <span className="text-foreground">{item.name} × {item.quantity}</span>
                      <span className="font-medium text-foreground">{formatMoney(item.total ?? Number(item.price) * item.quantity, currency)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground space-y-1">
                  <p>Delivery address: {order.shippingInfo?.address || '—'}</p>
                  <p className="font-medium text-foreground">
                    {isPaid
                      ? 'Payment confirmed. The merchant will deliver your order soon.'
                      : isKhqr
                      ? 'Please scan the KHQR code above with your banking app to complete payment.'
                      : 'Pay the courier in cash when your order is delivered.'}
                  </p>
                </div>
              </>
            )}
            {!single && (
              <Link className="mt-4 inline-block text-sm font-medium text-primary hover:underline" to={`/order/${order.id}`}>
                View order
              </Link>
            )}
          </section>
        );
      })}
      <div className="pt-2">
        <Link className="inline-block text-sm font-medium text-primary hover:underline" to={single ? '/orders' : '/products'}>
          {single ? 'All orders' : 'Continue shopping'}
        </Link>
      </div>
    </main>
  );
};
