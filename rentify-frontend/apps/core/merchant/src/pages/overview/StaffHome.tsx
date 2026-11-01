import { Link } from 'react-router-dom';
import { ChevronRight, MonitorSmartphone } from 'lucide-react';
import { useAuth, useTranslation } from '@rentify/utils';
import { Button } from '@rentify/shared/ui/button';
import { useChannels } from '../../context/ChannelContext';
import { openPosApp } from '../../utils/storeLinks';
import { useAccess, type StaffPermission } from '../../utils/access';
import { PageShell, Panel } from '../../components/page/PagePrimitives';

/** Places a staff member may open, in menu order, with the permission each needs. */
const PLACES: { permission: StaffPermission; to: string; key: string }[] = [
  { permission: 'manage_products', to: '/products', key: 'manage_products' },
  { permission: 'manage_invoices', to: '/invoices', key: 'manage_invoices' },
  { permission: 'manage_analytics', to: '/analytics', key: 'manage_analytics' },
  { permission: 'manage_settings', to: '/settings', key: 'manage_settings' },
];

/**
 * Home for staff who don't handle orders, such as a cashier (redesign M29): open the register,
 * and the few places their permissions allow. Counter numbers need the orders permission, so
 * they are not shown here.
 */
export function StaffHome() {
  const { t } = useTranslation();
  const { profile } = useAuth() as { profile?: { name?: string } };
  const { store } = useChannels();
  const access = useAccess();
  const firstName = profile?.name?.trim().split(/\s+/)[0] || '';
  const places = PLACES.filter((place) => access.can(place.permission));

  return (
    <PageShell width="narrow">
      <div>
        <p className="text-sm font-semibold text-muted-foreground">{store?.name} · {t('merchant.staffHome.role')}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          {t('merchant.staffHome.hello', { name: firstName }).replace(/,\s*$/, '')}
        </h1>
      </div>

      {access.can('manage_pos') && (
        <Panel className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground" aria-hidden="true">
              <MonitorSmartphone className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-foreground">{t('merchant.bottomNav.posIntroTitle')}</h2>
              <p className="text-sm text-muted-foreground">{t('merchant.home.posDetail')}</p>
            </div>
          </div>
          <Button onClick={openPosApp} className="min-h-[48px] w-full rounded-xl">{t('merchant.bottomNav.posIntroOpen')}</Button>
        </Panel>
      )}

      {places.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">{t('merchant.staffHome.alsoYouCan')}</h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
            {places.map((place) => (
              <li key={place.key}>
                <Link to={place.to} className="flex min-h-[56px] items-center justify-between gap-3 p-4 hover:bg-muted/40">
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{t(`merchant.staff.permissions.${place.key}.title`)}</span>
                    <span className="block text-sm text-muted-foreground">{t(`merchant.staff.permissions.${place.key}.body`)}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!access.can('manage_pos') && places.length === 0 && (
        <p className="text-sm text-muted-foreground">{t('merchant.staffHome.nothing')}</p>
      )}
    </PageShell>
  );
}

export default StaffHome;
