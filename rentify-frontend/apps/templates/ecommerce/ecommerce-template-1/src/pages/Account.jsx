import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, LogIn, LogOut, Package, UserRound } from 'lucide-react';
import { useGetMyOrdersQuery } from '@rentify/storefront/api';
import { useStorefrontWebsite } from '@rentify/storefront/website';
import { useCustomerSession } from '@rentify/storefront/customer';
import { customerSignInUrl } from '@rentify/storefront/config';
import { safeUrl } from '@rentify/storefront/content';
import { formatMoney } from '@rentify/storefront/commerce';
import { useI18n } from '../i18n';
import { orderPath } from '../paths';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ProductImage } from '../components/ProductImage';
import { EmptyState, ErrorState } from '../components/StatusMessage';
import { formatDate } from '../format';

const ORDERS_PER_PAGE = 10;

function OrderHistory({ websiteId, guest }) {
  const { t, language } = useI18n();
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, isError, refetch } = useGetMyOrdersQuery(
    { websiteId, page, limit: ORDERS_PER_PAGE },
    { skip: !websiteId }
  );
  const orders = data?.orders || [];
  const totalPages = data?.totalPages || 1;

  return (
    <section aria-labelledby="order-history" className="mt-8">
      <h2 id="order-history" className="text-lg font-semibold text-foreground">
        {guest ? t('account.guestOrders') : t('account.orders')}
      </h2>
      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-3" role="status" aria-label={t('common.loading')}>
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : orders.length === 0 ? (
          <EmptyState icon={Package} title={t('account.noOrders')} />
        ) : (
          <>
            <ul className={`space-y-3 ${isFetching ? 'opacity-60' : ''}`}>
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    to={orderPath(order.id)}
                    className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                    aria-label={t('account.viewOrder', { number: order.orderNumber || '' })}
                  >
                    <div className="flex -space-x-3">
                      {(order.items || []).slice(0, 3).map((item) => (
                        <ProductImage key={item.id} src={safeUrl(item.image)} alt="" className="h-12 w-12 rounded-lg border-2 border-card" />
                      ))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-semibold text-foreground">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(order.createdAt, language)}</p>
                      <p className="mt-1 text-xs font-medium text-foreground/80">
                        {t(`order.statuses.${order.status}`, { defaultValue: order.status })}
                        {order.paymentStatus && ` · ${t(`payment.statuses.${order.paymentStatus}`, { defaultValue: order.paymentStatus })}`}
                      </p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-foreground">{formatMoney(order.totalAmount)}</p>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
            {totalPages > 1 && (
              <nav aria-label={t('account.orders')} className="mt-5 flex items-center justify-between gap-3">
                <button type="button" className="btn-outline" disabled={page <= 1 || isFetching} onClick={() => setPage((current) => current - 1)}>
                  {t('account.previous')}
                </button>
                <span className="text-sm text-muted-foreground">{t('account.page', { page, total: totalPages })}</span>
                <button type="button" className="btn-outline" disabled={page >= totalPages || isFetching} onClick={() => setPage((current) => current + 1)}>
                  {t('account.next')}
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default function Account() {
  const { t } = useI18n();
  const { websiteId } = useStorefrontWebsite();
  const { customer, isAuthenticated, isLoading, signOut, isSigningOut } = useCustomerSession();
  useDocumentTitle(t('account.title'));
  const signInUrl = typeof window === 'undefined' ? null : customerSignInUrl(window.location.href);

  return (
    <div className="store-container max-w-3xl py-6 sm:py-10">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t('account.title')}</h1>

      <div className="mt-6 rounded-xl border border-border bg-card p-5 sm:p-6">
        {isLoading ? (
          <div className="h-14 animate-pulse rounded-lg bg-muted" role="status" aria-label={t('common.loading')} />
        ) : isAuthenticated ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserRound className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">
                  {t('account.signedInAs', { name: customer.name || customer.email || '' })}
                </p>
                {customer.email && <p className="truncate text-sm text-muted-foreground">{customer.email}</p>}
              </div>
            </div>
            <button type="button" className="btn-outline" onClick={signOut} disabled={isSigningOut}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {t('account.signOut')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {signInUrl ? t('account.signInBody') : t('account.signInUnavailable')}
            </p>
            {signInUrl && (
              <a href={signInUrl} className="btn-primary shrink-0">
                <LogIn className="h-4 w-4" aria-hidden="true" />
                {t('account.signIn')}
              </a>
            )}
          </div>
        )}
      </div>

      {!isLoading && <OrderHistory key={isAuthenticated ? 'customer' : 'guest'} websiteId={websiteId} guest={!isAuthenticated} />}
    </div>
  );
}
