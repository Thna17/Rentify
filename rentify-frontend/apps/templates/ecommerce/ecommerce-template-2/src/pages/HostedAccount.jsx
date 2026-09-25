import { LogIn } from 'lucide-react';
import { hostedSignInUrl } from '@rentify/storefront/hostedBuyer';
import { HostedBuyerOrders } from '@rentify/storefront/routes/HostedBuyerOrders';
import { useI18n } from '../i18n';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

/**
 * Account page for hosted-storefront buyer mode: buyers sign in with their
 * Rentify account, and orders come from the hosted storefront order API.
 */
export default function HostedAccount() {
  const { t } = useI18n();
  useDocumentTitle(t('account.title'));
  return (
    <div className="store-container max-w-3xl py-6 sm:py-10">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{t('account.title')}</h1>
      <div className="mt-6 flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <p className="text-sm text-muted-foreground">{t('account.signInBody')}</p>
        <a href={hostedSignInUrl()} className="btn-primary shrink-0">
          <LogIn className="h-4 w-4" aria-hidden="true" />
          {t('account.signIn')}
        </a>
      </div>
      <HostedBuyerOrders />
    </div>
  );
}
