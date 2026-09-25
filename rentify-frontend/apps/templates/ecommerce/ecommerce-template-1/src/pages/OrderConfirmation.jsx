import { useCallback, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2, ClipboardX } from 'lucide-react';
import { useGetMyOrderDetailsQuery } from '@rentify/storefront/api';
import { formatMoney, getProductImages, toAmount } from '@rentify/storefront/commerce';
import { useI18n } from '../i18n';
import { formatDate } from '../format';
import { PATHS } from '../paths';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { KhqrPayment } from '../components/KhqrPayment';
import { ProductImage } from '../components/ProductImage';
import { EmptyState, ErrorState } from '../components/StatusMessage';

const CLOSED_ORDER_STATUSES = ['cancelled', 'refunded'];
const PAID_STATUSES = ['paid', 'completed'];

function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-muted text-foreground',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    error: 'bg-error/10 text-error',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export default function OrderConfirmation() {
  const { t, language } = useI18n();
  const { orderId } = useParams();
  const location = useLocation();
  const justPlaced = Boolean(location.state?.placed);
  const placedTotals = location.state?.totals;
  const { data: apiOrder, isLoading, isError, error, refetch } = useGetMyOrderDetailsQuery(orderId, { skip: !orderId });
  // Snapshot of the order just placed from this browser, used if the receipt
  // endpoint cannot return it (see receipt.js).
  const snapshot = location.state?.receipt?.id === orderId ? location.state.receipt : null;
  const order = apiOrder || (isError ? snapshot : null);
  const [settledPaymentStatus, setSettledPaymentStatus] = useState(null);
  useDocumentTitle(order?.orderNumber ? `${t('order.reference')} ${order.orderNumber}` : t('order.reference'));

  const onPaymentSettled = useCallback(
    (status) => {
      setSettledPaymentStatus(status);
      refetch();
    },
    [refetch]
  );

  if (isLoading) {
    return (
      <div className="store-container max-w-3xl py-10" role="status" aria-label={t('common.loading')}>
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
        <div className="mt-6 h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="store-container max-w-3xl py-10">
        {error?.status === 404 || error?.status === 403 || !isError ? (
          <EmptyState as="h1" icon={ClipboardX} title={t('order.notFoundTitle')} body={t('order.notFoundBody')}>
            <Link to={PATHS.PRODUCTS} className="btn-primary">
              {t('order.keepShopping')}
            </Link>
          </EmptyState>
        ) : (
          <ErrorState onRetry={refetch} />
        )}
      </div>
    );
  }

  const currency = order.currency || 'USD';
  const payment = order.payment;
  const paymentStatus = settledPaymentStatus || payment?.status || 'pending';
  const paid = PAID_STATUSES.includes(paymentStatus);
  const closed = CLOSED_ORDER_STATUSES.includes(order.status);
  const awaitingKhqr = payment?.paymentMethod === 'KHQR' && paymentStatus === 'pending' && !closed;
  const shipping = order.shippingDetail || {};
  const items = Array.isArray(order.OrderItems) ? order.OrderItems : [];
  // The receipt endpoint only returns the total; the breakdown is available
  // right after checkout from the order-creation response.
  const breakdown = placedTotals && toAmount(placedTotals.totalAmount) === toAmount(order.totalAmount) ? placedTotals : null;
  const statusLabel = t(`order.statuses.${order.status}`, { defaultValue: order.status });
  const reference = order.orderNumber || String(order.id).slice(0, 8).toUpperCase();

  let nextStep = t('order.nextCod', { phone: shipping.phone || '' });
  if (closed) nextStep = t('order.nextClosed', { status: statusLabel.toLowerCase() });
  else if (awaitingKhqr) nextStep = t('order.nextKhqr');
  else if (paid) nextStep = t('order.nextPaid');

  return (
    <div className="store-container max-w-3xl py-6 sm:py-10">
      <header className="rounded-xl border border-border bg-card p-5 sm:p-6">
        {justPlaced && (
          <div className="mb-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 shrink-0 text-success" aria-hidden="true" />
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{t('order.thanks')}</h1>
          </div>
        )}
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">{t('order.reference')}</dt>
            <dd className="mt-0.5 font-mono text-base font-semibold text-foreground">
              {justPlaced ? reference : <h1 className="text-base">{reference}</h1>}
            </dd>
            <dd className="text-xs text-muted-foreground">{formatDate(order.createdAt, language)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t('order.status')}</dt>
            <dd className="mt-1">
              <Badge tone={closed ? 'error' : order.status === 'pending' ? 'warning' : 'success'}>{statusLabel}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t('order.payment')}</dt>
            <dd className="mt-1 flex flex-wrap items-center gap-2 text-sm text-foreground">
              {payment ? t(`payment.${payment.paymentMethod}`, { defaultValue: payment.paymentMethod }) : '—'}
              {payment && (
                <Badge tone={paid ? 'success' : ['failed', 'expired'].includes(paymentStatus) ? 'error' : 'warning'}>
                  {t(`payment.statuses.${paymentStatus}`, { defaultValue: paymentStatus })}
                </Badge>
              )}
            </dd>
          </div>
        </dl>
      </header>

      <section aria-labelledby="next-steps" className="mt-6 rounded-xl bg-primary/5 p-5">
        <h2 id="next-steps" className="text-sm font-semibold text-foreground">
          {t('order.nextTitle')}
        </h2>
        <p className="mt-1 text-sm text-foreground/80">{nextStep}</p>
      </section>

      {awaitingKhqr && (
        <div className="mt-6">
          <KhqrPayment payment={payment} currency={currency} onSettled={onPaymentSettled} />
        </div>
      )}

      <section aria-labelledby="order-items" className="mt-6 rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 id="order-items" className="text-base font-semibold text-foreground">
          {t('order.items')}
        </h2>
        <ul className="mt-2 divide-y divide-border">
          {items.map((item) => {
            const name = item.Product?.name || '';
            const image = getProductImages(item.Product, name)[0];
            return (
              <li key={item.id} className="flex items-center gap-3 py-3">
                <ProductImage src={image?.url} alt="" className="h-14 w-14 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{name}</p>
                  <p className="text-xs text-muted-foreground">{t('order.quantity', { count: item.quantity })}</p>
                </div>
                <p className="text-sm font-medium tabular-nums text-foreground">
                  {formatMoney(toAmount(item.price) * toAmount(item.quantity), currency)}
                </p>
              </li>
            );
          })}
        </ul>
        <dl className="mt-3 space-y-1.5 border-t border-border pt-4 text-sm">
          {breakdown && (
            <>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t('order.subtotal')}</dt>
                <dd className="tabular-nums">{formatMoney(breakdown.subtotal, currency)}</dd>
              </div>
              {toAmount(breakdown.shippingFee) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t('order.delivery')}</dt>
                  <dd className="tabular-nums">{formatMoney(breakdown.shippingFee, currency)}</dd>
                </div>
              )}
              {toAmount(breakdown.taxTotal) > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t('order.tax')}</dt>
                  <dd className="tabular-nums">{formatMoney(breakdown.taxTotal, currency)}</dd>
                </div>
              )}
            </>
          )}
          <div className="flex justify-between pt-1 text-base font-semibold text-foreground">
            <dt>{t('order.total')}</dt>
            <dd className="tabular-nums">{formatMoney(order.totalAmount, currency)}</dd>
          </div>
        </dl>
      </section>

      {(shipping.name || shipping.phone) && (
        <section aria-labelledby="delivery-details" className="mt-6 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 id="delivery-details" className="text-base font-semibold text-foreground">
            {t('order.deliverTo')}
          </h2>
          <address className="mt-2 space-y-0.5 text-sm not-italic text-foreground/85">
            <p className="font-medium text-foreground">{shipping.name}</p>
            {shipping.phone && <p>{shipping.phone}</p>}
            <p>{[shipping.street, shipping.commune, shipping.district, shipping.province].filter(Boolean).join(', ')}</p>
            {shipping.note && <p className="text-muted-foreground">{shipping.note}</p>}
          </address>
        </section>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link to={PATHS.PRODUCTS} className="btn-primary flex-1">
          {t('order.keepShopping')}
        </Link>
        <Link to={PATHS.ACCOUNT} className="btn-outline flex-1">
          {t('order.myOrders')}
        </Link>
      </div>
    </div>
  );
}
