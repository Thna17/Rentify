import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { useCheckStorefrontPaymentStatusQuery } from '@rentify/storefront/api';
import { safeUrl } from '@rentify/storefront/content';
import { formatMoney } from '@rentify/storefront/commerce';
import { useI18n } from '../i18n';

const POLL_INTERVAL_MS = 6000;
const POLL_WINDOW_MS = 15 * 60 * 1000;
export const SETTLED_PAYMENT_STATUSES = ['paid', 'completed', 'failed', 'expired', 'refunded'];

/**
 * KHQR payment step. Uses only browser-safe fields from the customer receipt
 * (payment id, amount, status, QR payload and Bakong deeplink). Polls the
 * storefront payment-status endpoint while the page is visible, for a bounded
 * window, and reports settled statuses through `onSettled`.
 */
export function KhqrPayment({ payment, currency = 'USD', onSettled }) {
  const { t } = useI18n();
  const [polling, setPolling] = useState(true);
  const { data, isFetching, refetch } = useCheckStorefrontPaymentStatusQuery(payment.id, {
    skip: !payment.id,
    pollingInterval: polling ? POLL_INTERVAL_MS : 0,
    skipPollingIfUnfocused: true,
  });
  const status = data?.status || payment.status || 'pending';
  const settled = SETTLED_PAYMENT_STATUSES.includes(status);

  useEffect(() => {
    const timer = window.setTimeout(() => setPolling(false), POLL_WINDOW_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (settled) {
      setPolling(false);
      onSettled?.(status);
    }
  }, [settled, status, onSettled]);

  const amount = formatMoney(payment.amount, currency);
  const deeplink = safeUrl(payment.qrCodeUrl);

  if (settled) return null;

  return (
    <section aria-labelledby="khqr-title" className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <h2 id="khqr-title" className="text-lg font-semibold text-foreground">
        {t('khqr.title')}
      </h2>
      <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        {payment.rawQR ? (
          <div className="rounded-xl border border-border bg-white p-3">
            <QRCodeSVG value={payment.rawQR} size={208} level="M" marginSize={1} title={t('khqr.qrLabel', { amount })} />
          </div>
        ) : null}
        <div className="w-full space-y-3 text-center sm:text-left">
          <div>
            <p className="text-sm text-muted-foreground">{t('khqr.amount')}</p>
            <p className="text-2xl font-bold tabular-nums text-foreground">{amount}</p>
          </div>
          <p className="text-sm text-muted-foreground">{t('khqr.scan')}</p>
          {deeplink && /^https:/.test(deeplink) && (
            <a href={deeplink} className="btn-primary w-full sm:w-auto" rel="noopener noreferrer">
              {t('khqr.openApp')}
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          )}
          <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 text-sm text-muted-foreground sm:justify-start">
            {polling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t('khqr.checking')}
              </>
            ) : (
              <span>{t('khqr.paused')}</span>
            )}
          </div>
          {!polling && (
            <button type="button" className="btn-outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
              {t('khqr.checkAgain')}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
