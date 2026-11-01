import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '@rentify/utils';
import { AlertCircle, ChevronRight, ExternalLink, Package, Palette, Share2, Truck } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import { useChannels } from '../../context/ChannelContext';
import { hiddenReason, useMarketplaceListing } from '../../hooks/useMarketplaceListing';
import { marketplaceStoreUrl } from '../../utils/storeLinks';
import { getDeliveryPolicy, formatFee, type DeliveryPolicy } from '../../app/features/delivery-fee/deliveryFeeApi';
import { StatusPill } from '../../components/data-table/StatusPill';
import { FilterChips, PageShell, PageTitle, Panel, StatePanel } from '../../components/page/PagePrimitives';

const TONE = { listed: 'success', pending: 'info', paused: 'danger', off: 'neutral', unknown: 'neutral' } as const;

/** Rentify Market (redesign M16): is the Store listed, which products buyers see and why others are hidden. */
export function MarketplacePage() {
  const { t } = useTranslation();
  const { store } = useChannels();
  const listing = useMarketplaceListing();
  const [filter, setFilter] = useState<'shown' | 'hidden'>('shown');
  const [policy, setPolicy] = useState<DeliveryPolicy | null | undefined>(undefined);

  useEffect(() => {
    if (!store?.id) return;
    let active = true;
    getDeliveryPolicy(store.id)
      .then((value) => active && setPolicy(value))
      .catch(() => active && setPolicy(undefined));
    return () => {
      active = false;
    };
  }, [store?.id]);

  const enabled = store?.marketplaceEnabled !== false;
  const list = filter === 'shown' ? listing.shown : listing.hidden;

  return (
    <PageShell width="medium">
      <PageTitle title={t('merchant.marketplace.title')} description={t('merchant.marketplace.subtitle')} />

      <Panel className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-foreground">{t('merchant.marketplace.listing')}</h2>
          <StatusPill tone={TONE[listing.status]}>{t(`merchant.marketplace.status.${listing.status}`)}</StatusPill>
        </div>
        <p className="text-sm text-muted-foreground">{t(`merchant.marketplace.statusBody.${listing.status}`)}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="min-h-[44px] rounded-xl">
            <Link to="/marketplace/customization">
              <Palette className="h-4 w-4" aria-hidden="true" />
              {t('merchant.marketplace.editDesign')}
            </Link>
          </Button>
          {listing.status === 'listed' && (
            <Button asChild variant="outline" className="min-h-[44px] rounded-xl">
              <a href={marketplaceStoreUrl(store)} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                {t('merchant.marketplace.viewStorePage')}
              </a>
            </Button>
          )}
          <Button asChild variant="outline" className="min-h-[44px] rounded-xl">
            <Link to="/share"><Share2 className="h-4 w-4" aria-hidden="true" />{t('merchant.marketplace.share')}</Link>
          </Button>
          {listing.status === 'paused' && (
            <Button asChild variant="outline" className="min-h-[44px] rounded-xl">
              <Link to="/help">{t('merchant.orders.detail.getHelp')}</Link>
            </Button>
          )}
        </div>
      </Panel>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">{t('merchant.marketplace.products')}</h2>
        <FilterChips
          label={t('merchant.marketplace.products')}
          items={[
            { id: 'shown', label: t('merchant.marketplace.shown'), count: listing.loading ? undefined : listing.shown.length },
            { id: 'hidden', label: t('merchant.marketplace.hidden'), count: listing.loading ? undefined : listing.hidden.length },
          ]}
          value={filter}
          onChange={setFilter}
        />
        {listing.loading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}</div>
        ) : listing.error ? (
          <StatePanel
            tone="error"
            icon={<AlertCircle className="h-5 w-5" />}
            title={t('merchant.marketplace.loadError')}
            body={t('merchant.orders.loadErrorBody')}
            action={<Button variant="outline" onClick={listing.reload} className="min-h-[44px] rounded-xl">{t('merchant.common.retry')}</Button>}
          />
        ) : list.length === 0 ? (
          <StatePanel
            icon={<Package className="h-5 w-5" />}
            title={t(filter === 'shown' ? 'merchant.marketplace.noneShown' : 'merchant.marketplace.noneHidden')}
            action={
              filter === 'shown' ? (
                <Button asChild className="min-h-[44px] rounded-xl"><Link to="/products/create">{t('merchant.marketplace.addProduct')}</Link></Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
            {list.map((product) => {
              const reason = hiddenReason(product, enabled);
              const soldOut = Number(product.stockQuantity || 0) <= 0;
              return (
                <li key={product.id}>
                  <Link to={`/products/edit/${product.id}`} className="flex min-h-[64px] items-center justify-between gap-3 p-4 hover:bg-muted/40">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">{product.name}</span>
                      <span className="block text-sm text-muted-foreground">
                        {reason
                          ? t(`merchant.marketplace.reason.${reason}`)
                          : soldOut
                            ? t('merchant.marketplace.soldOut')
                            : t('merchant.marketplace.inStock', { price: formatFee(product.price), count: product.stockQuantity })}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">{t('merchant.marketplace.appearance')}</h2>
        <Link
          to="/marketplace/customization"
          className="flex min-h-[64px] items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] hover:bg-muted/40"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground" aria-hidden="true">
              <Palette className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">{t('merchant.marketplace.appearanceTitle')}</span>
              <span className="block text-sm text-muted-foreground">{t('merchant.marketplace.appearanceBody')}</span>
            </span>
          </span>
          <div className="flex items-center gap-2.5">
            <span
              className="h-5 w-5 rounded-full border border-border shadow-sm ring-1 ring-black/10 shrink-0"
              style={{ backgroundColor: store?.marketplaceColor || '#4f46e5' }}
              title={`Active color: ${store?.marketplaceColor || '#4f46e5'}`}
            />
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </div>
        </Link>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">{t('merchant.marketplace.delivery')}</h2>
        <Link
          to="/settings/delivery"
          className="flex min-h-[64px] items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)] hover:bg-muted/40"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground" aria-hidden="true">
              <Truck className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">{t('merchant.orders.detail.deliveryFee')}</span>
              <span className="block text-sm text-muted-foreground">
                {policy === undefined
                  ? t('merchant.marketplace.feeUnknown')
                  : policy
                    ? t('merchant.marketplace.fee', { fee: formatFee(policy.flatFee) })
                    : t('merchant.marketplace.feeMissing')}
              </span>
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Link>
      </section>
    </PageShell>
  );
}

export default MarketplacePage;
