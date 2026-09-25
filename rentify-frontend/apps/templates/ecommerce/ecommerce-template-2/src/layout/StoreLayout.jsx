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
import { StorefrontOwnerProvider } from '@rentify/storefront/owner/StorefrontOwner';
import { TEMPLATE_2_FIELDS } from '../storeContent';

/** New pages start at the top; `#section` links scroll to that section once it has rendered. */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return undefined;
    }
    let attempts = 0;
    const timer = window.setInterval(() => {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target || ++attempts > 20) window.clearInterval(timer);
      target?.scrollIntoView({ block: 'start' });
    }, 100);
    return () => window.clearInterval(timer);
  }, [pathname, hash]);
  return null;
}

export function StoreLayout() {
  const { t } = useI18n();
  const { websiteId, isLoading, error, refetch } = useStorefrontWebsite();
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
    <StorefrontOwnerProvider fields={TEMPLATE_2_FIELDS}>
      <div className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded-lg bg-card px-4 py-2 font-medium text-foreground shadow focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          {t('nav.skip')}
        </a>
        <ScrollManager />
        <Header />
        <main
          id="main"
          tabIndex={-1}
          className="relative flex-1 focus:outline-none"
        >
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
        <Footer />
        <CartPill totals={cart.totals} currency={cart.currency} />
      </div>
    </StorefrontOwnerProvider>
  );
}
