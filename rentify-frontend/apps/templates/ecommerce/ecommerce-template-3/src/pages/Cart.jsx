import { useState } from 'react';
import { useStorefrontCart } from '@rentify/storefront/cart';
import { getApiErrorMessage } from '@rentify/storefront/commerce';
import { useI18n } from '../i18n';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { CartView } from '../components/CartView';
import { ErrorState } from '../components/StatusMessage';

export default function Cart() {
  const { t } = useI18n();
  const cart = useStorefrontCart();
  const [busyLineId, setBusyLineId] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const [error, setError] = useState('');
  useDocumentTitle(t('cart.title'));

  const run = async (line, action, successMessage) => {
    setBusyLineId(line.id);
    setError('');
    try {
      await action();
      setAnnouncement(successMessage);
    } catch (failure) {
      setError(getApiErrorMessage(failure, t('cart.updateFailed')));
    } finally {
      setBusyLineId(null);
    }
  };

  const onQuantityChange = (line, quantity) =>
    run(line, () => cart.updateQuantity(line.id, quantity), t('cart.updated'));
  const onRemove = (line) =>
    run(line, () => cart.removeItem(line.id), t('cart.removed', { name: line.Product?.name || '' }));

  return (
    <div className="store-container py-6 sm:py-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t('cart.title')}</h1>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}
      {cart.isLoading ? (
        <div className="grid gap-8 lg:grid-cols-[1fr_22rem]" role="status" aria-label={t('common.loading')}>
          <div className="h-64 animate-pulse rounded-xl bg-muted" />
          <div className="h-48 animate-pulse rounded-xl bg-muted" />
        </div>
      ) : cart.isError ? (
        <ErrorState onRetry={cart.refetch} />
      ) : (
        <CartView
          lines={cart.lines}
          totals={cart.totals}
          quote={cart.quote}
          currency={cart.currency}
          busyLineId={busyLineId}
          onQuantityChange={onQuantityChange}
          onRemove={onRemove}
        />
      )}
    </div>
  );
}
