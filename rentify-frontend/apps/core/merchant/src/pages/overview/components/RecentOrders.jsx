import { Card } from '@rentify/shared/ui/card';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';

const STATUS_STYLES = {
  pending: 'bg-amber-500/10 text-amber-700',
  confirmed: 'bg-primary/10 text-primary',
  processing: 'bg-primary/10 text-primary',
  completed: 'bg-emerald-500/10 text-emerald-700',
  fulfilled: 'bg-emerald-500/10 text-emerald-700',
  cancelled: 'bg-rose-500/10 text-rose-700',
};

const formatStatus = (status) =>
  (status || 'pending').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

const formatDate = (value, locale) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
};

export const RecentOrders = ({ orders = [], isLoading, labels = {}, statusLabels = {}, locale = 'en-US' }) => {
  const copy = { title: 'Recent orders', viewAll: 'View all', empty: 'No orders yet in this period.', order: 'Order', customer: 'Customer', date: 'Date', status: 'Status', total: 'Total', guest: 'Guest', ...labels };
  const navigate = useNavigate();

  return (
    <Card className="gap-0 p-6 bg-card">
      <div className="flex items-center justify-between pb-4">
        <h3 className="text-base font-semibold text-foreground">{copy.title}</h3>
        <button
          type="button"
          onClick={() => navigate('/orders')}
          className="text-sm font-medium text-primary hover:underline"
        >
          {copy.viewAll}
        </button>
      </div>
      <div>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
            <ClipboardList className="h-8 w-8 opacity-40" />
            <p className="text-sm">{copy.empty}</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-muted-foreground">
                  <th className="px-2 pb-2 font-medium">{copy.order}</th>
                  <th className="px-2 pb-2 font-medium">{copy.customer}</th>
                  <th className="px-2 pb-2 font-medium">{copy.date}</th>
                  <th className="px-2 pb-2 font-medium">{copy.status}</th>
                  <th className="px-2 pb-2 font-medium text-right">{copy.total}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="cursor-pointer border-t border-border/60 hover:bg-muted/50"
                  >
                    <td className="px-2 py-3 font-medium text-foreground">
                      #{String(order.id).slice(0, 8)}
                    </td>
                    <td className="px-2 py-3 text-muted-foreground truncate max-w-[140px]">
                      {order.shippingDetails?.name || order.customerName || copy.guest}
                    </td>
                    <td className="px-2 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(order.createdAt, locale)}
                    </td>
                    <td className="px-2 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[order.status] || 'bg-muted text-muted-foreground'}`}
                      >
                        {statusLabels[order.status] || formatStatus(order.status)}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-right font-medium text-foreground whitespace-nowrap">
                      ${parseFloat(order.totalAmount || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
};

export default RecentOrders;
