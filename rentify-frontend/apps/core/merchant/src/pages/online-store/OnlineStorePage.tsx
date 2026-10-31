import { Link } from 'react-router-dom';
import { AlertCircle, Building2, ChevronRight, ExternalLink, LayoutTemplate, Palette, Share2 } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import { useGetWebsiteQuery } from '@rentify/apis';
import { useTranslation } from '@rentify/utils';
import { StatusPill } from '../../components/data-table/StatusPill';
import { PageShell, PageTitle, Panel, StatePanel } from '../../components/page/PagePrimitives';

type SiteState = 'live' | 'setting_up' | 'paused' | 'failed' | 'unavailable';

/** Core Website.status in merchant words. Only `active` is live. */
const siteState = (status?: string): SiteState => {
  if (status === 'active') return 'live';
  if (['customization', 'pending', 'building'].includes(String(status))) return 'setting_up';
  if (['suspended', 'expired'].includes(String(status))) return 'paused';
  if (status === 'failed') return 'failed';
  return 'unavailable';
};
const TONE = { live: 'success', setting_up: 'info', paused: 'warning', failed: 'danger', unavailable: 'neutral' } as const;

/** Online store (redesign M17): status and address, then where to change its look and content. */
export function OnlineStorePage() {
  const { t } = useTranslation();
  const { data: website, isLoading, isError, refetch } = useGetWebsiteQuery(undefined);

  const title = <PageTitle title={t('merchant.onlineStore.title')} description={t('merchant.onlineStore.subtitle')} />;

  if (isLoading) {
    return (
      <PageShell width="medium">
        {title}
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </PageShell>
    );
  }

  if (isError || !website) {
    return (
      <PageShell width="medium">
        {title}
        <StatePanel
          tone="error"
          icon={<AlertCircle className="h-5 w-5" />}
          title={t('merchant.onlineStore.loadError')}
          body={t('merchant.orders.loadErrorBody')}
          action={<Button variant="outline" onClick={() => refetch()} className="min-h-[44px] rounded-xl">{t('merchant.common.retry')}</Button>}
        />
      </PageShell>
    );
  }

  const state = siteState(website.status);
  const address: string | null = website.storefrontUrl || website.domain || null;
  const href = address ? (/^https?:\/\//.test(address) ? address : `https://${address}`) : null;
  const sections = [
    { to: '/customization', icon: LayoutTemplate, title: 'design', body: 'designBody' },
    { to: '/online-store/edit', icon: Palette, title: 'content', body: 'contentBody' },
    { to: '/settings/account', icon: Building2, title: 'details', body: 'detailsBody' },
  ];

  return (
    <PageShell width="medium">
      {title}

      <Panel className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={TONE[state]}>{t(`merchant.onlineStore.state.${state}`)}</StatusPill>
          <span className="break-all text-sm font-semibold text-foreground">
            {address ? address.replace(/^https?:\/\//, '') : t('merchant.home.noAddress')}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{t(`merchant.onlineStore.stateBody.${state}`)}</p>
        <div className="flex flex-wrap gap-2">
          {href && state === 'live' && (
            <Button asChild variant="outline" className="min-h-[44px] rounded-xl">
              <a href={href} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                {t('merchant.home.visit')}
              </a>
            </Button>
          )}
          <Button asChild variant="outline" className="min-h-[44px] rounded-xl">
            <Link to="/share"><Share2 className="h-4 w-4" aria-hidden="true" />{t('merchant.marketplace.share')}</Link>
          </Button>
        </div>
      </Panel>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">{t('merchant.onlineStore.yourStore')}</h2>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
          {sections.map(({ to, icon: Icon, title: key, body }) => (
            <li key={to}>
              <Link to={to} className="flex min-h-[64px] items-center justify-between gap-3 p-4 hover:bg-muted/40">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground" aria-hidden="true">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">{t(`merchant.onlineStore.${key}`)}</span>
                    <span className="block text-sm text-muted-foreground">{t(`merchant.onlineStore.${body}`)}</span>
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}

export default OnlineStorePage;
