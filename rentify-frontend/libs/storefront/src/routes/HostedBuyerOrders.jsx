import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStorefrontWebsite } from '../website';
import { hostedCheckoutUrl, hostedRequest } from '../hostedBuyer';

export const HostedBuyerOrders = ({ single = false }) => {
  const { websiteId } = useStorefrontWebsite();
  const { orderId, id } = useParams();
  const selectedId = orderId || id;
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!websiteId) return;
    setLoading(true);
    const path = single ? `/my-orders/${encodeURIComponent(selectedId)}` : '/my-orders';
    hostedRequest(hostedCheckoutUrl(websiteId, path))
      .then((data) => { setOrders(single ? [data.order] : data.orders || []); setError(''); })
      .catch((caught) => setError(caught.message))
      .finally(() => setLoading(false));
  }, [websiteId, selectedId, single]);

  return <main className="mx-auto max-w-3xl space-y-5 px-4 py-10">
    <h1 className="text-2xl font-semibold">{single ? 'Order confirmation' : 'My orders'}</h1>
    {loading && <p>Loading orders…</p>}
    {error && <p role="alert" className="text-red-600">{error}</p>}
    {!loading && !error && orders.length === 0 && <p>No orders yet.</p>}
    {orders.filter(Boolean).map((order) => <section key={order.id} className="rounded-xl border p-5">
      <div className="flex flex-wrap justify-between gap-2">
        <div><p className="font-semibold">Order {order.orderNumber || order.id}</p>
          <p className="text-sm">{order.salesChannel === 'storefront' ? 'Storefront' : 'Marketplace'} · {order.deliveryStatus}</p></div>
        <strong>${Number(order.totalAmount).toFixed(2)} COD</strong>
      </div>
      {single && <><ul className="mt-4 space-y-1">{(order.items || []).map((item) =>
        <li key={item.productId}>{item.name} × {item.quantity} — ${Number(item.total).toFixed(2)}</li>)}</ul>
        <p className="mt-3 text-sm">Delivery: {order.shippingInfo?.address}</p>
        <p className="text-sm">Pay the merchant when your order is delivered.</p></>}
      {!single && <Link className="mt-3 inline-block underline" to={`/order/${order.id}`}>View order</Link>}
    </section>)}
    <Link className="inline-block underline" to={single ? '/orders' : '/products'}>
      {single ? 'All orders' : 'Continue shopping'}
    </Link>
  </main>;
};
