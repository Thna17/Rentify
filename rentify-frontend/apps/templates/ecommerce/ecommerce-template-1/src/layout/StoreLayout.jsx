import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Store } from 'lucide-react';
import { useStorefrontWebsite } from '@rentify/storefront/website';
import { useStorefrontCart } from '@rentify/storefront/cart';
import { useI18n } from '../i18n';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { EmptyState, ErrorState } from '../components/StatusMessage';
import { PageSkeleton } from '../components/PageSkeleton';
import { CartPill } from '../components/CartPill';
import { WeavePattern } from '../components/decor/Artwork';
import { StorefrontOwnerProvider } from '@rentify/storefront/owner/StorefrontOwner';
import { TEMPLATE_1_FIELDS } from '../ownerFields';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function StoreLayout() {
  const { t } = useI18n();
  const { websiteId, isLoading, error, refetch, identity } =
    useStorefrontWebsite();
  const scenic = identity?.headerStyle !== 'classic';
  const cart = useStorefrontCart();

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="h-[var(--header-height)] border-b border-border bg-card" />
        <PageSkeleton />
      </div>
    );
  }

  if (!websiteId) {
    const notFound = error?.status === 404 || !error;
    return (
      <main className="store-container flex min-h-screen items-center justify-center py-16">
        {notFound ? (
          <EmptyState
            as="h1"
            icon={Store}
            title={t('error.storeTitle')}
            body={t('error.storeBody')}
            className="w-full max-w-md"
          />
        ) : (
          <ErrorState onRetry={refetch} className="w-full max-w-md" />
        )}
      </main>
    );
  }

  return (
    <StorefrontOwnerProvider fields={TEMPLATE_1_FIELDS}>
      <div className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded-lg bg-card px-4 py-2 font-medium text-foreground shadow focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          {t('nav.skip')}
        </a>
        <ScrollToTop />
        <Header />
        <main
          id="main"
          tabIndex={-1}
          className={`relative flex-1 focus:outline-none ${
            scenic
              ? '-mt-7 rounded-t-[1.75rem] bg-background shadow-[0_-8px_24px_-16px_oklch(var(--foreground)/0.25)]'
              : ''
          }`}
        >
          {scenic && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-t-[1.75rem] text-primary opacity-[0.045]">
              <WeavePattern />
            </div>
          )}
          <div className="relative">
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
        <Footer />
        <CartPill totals={cart.totals} currency={cart.currency} />
      </div>
    </StorefrontOwnerProvider>
  );
}
