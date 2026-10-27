import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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
        return (
          <section key={order.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-semibold text-foreground">Order {order.orderNumber || order.id}</p>
                <p className="text-sm text-muted-foreground">
                  {order.salesChannel === 'storefront' ? 'Storefront' : 'Marketplace'} · {order.deliveryStatus || order.status}
                </p>
              </div>
              <strong className="text-foreground">{formatMoney(order.totalAmount, currency)} COD</strong>
            </div>
            {single && (
              <>
                <ul className="mt-4 space-y-1.5 border-t border-border pt-3">
                  {(order.items || []).map((item) => (
                    <li key={item.productId} className="flex justify-between text-sm">
                      <span>{item.name} × {item.quantity}</span>
                      <span className="font-medium">{formatMoney(item.total ?? Number(item.price) * item.quantity, currency)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground space-y-1">
                  <p>Delivery address: {order.shippingInfo?.address || '—'}</p>
                  <p className="font-medium text-foreground">Pay the courier in cash when your order is delivered.</p>
                </div>
              </>
            )}
            {!single && (
              <Link className="mt-3 inline-block text-sm font-medium text-primary hover:underline" to={`/order/${order.id}`}>
                View order
              </Link>
            )}
          </section>
        );
      })}
      <div>
        <Link className="inline-block text-sm font-medium text-primary hover:underline" to={single ? '/orders' : '/products'}>
          {single ? 'All orders' : 'Continue shopping'}
        </Link>
      </div>
    </main>
  );
};
