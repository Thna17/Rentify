import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ClipboardList, Home, MonitorSmartphone, Package, Share2 } from 'lucide-react';
import { useTranslation } from '@rentify/utils';
import { ResponsiveDialog } from '@rentify/shared/ui';
import { useAccess } from '../../utils/access';
import { openPosApp } from '../../utils/storeLinks';

// Full-screen tasks keep the whole screen; the bar would only cover their own actions.
const HIDDEN_ON = [/^\/products\/create/, /^\/products\/edit\//, /^\/customization/];

const POS_VISITED_KEY = 'rentify_pos_visited';
const posVisited = () => {
  try {
    return localStorage.getItem(POS_VISITED_KEY) === 'true';
  } catch {
    return false;
  }
};

export const bottomBarVisible = (pathname: string) => !HIDDEN_ON.some((pattern) => pattern.test(pathname));

interface Tab {
  key: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onSelect: () => void;
}

/**
 * Phone navigation (docs/specs/merchant-setup-guide.md, phase C): shortcuts to the places a merchant
 * uses many times a day. The ☰ drawer stays the full menu; this bar never replaces it.
 */
export function MobileBottomBar({ hasPos }: { hasPos: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const access = useAccess();
  const [posIntroOpen, setPosIntroOpen] = useState(false);

  if (!bottomBarVisible(pathname)) return null;

  const at = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
  const tabs = [
    { key: 'home', label: t('merchant.bottomNav.home'), icon: <Home />, active: pathname === '/' || at('/overview'), onSelect: () => navigate('/overview') },
    access.can('manage_orders') && {
      key: 'orders', label: t('merchant.bottomNav.orders'), icon: <ClipboardList />,
      active: at('/orders') || at('/marketplace-orders'), onSelect: () => navigate('/orders'),
    },
    access.can('manage_products') && {
      key: 'products', label: t('merchant.bottomNav.products'), icon: <Package />,
      active: at('/products') || at('/catalog'), onSelect: () => navigate('/products'),
    },
    hasPos && access.can('manage_pos') && {
      key: 'pos', label: t('merchant.bottomNav.pos'), icon: <MonitorSmartphone />, active: false,
      // The register is its own app; explain that once, then open it directly.
      onSelect: () => (posVisited() ? openPosApp() : setPosIntroOpen(true)),
    },
    { key: 'share', label: t('merchant.bottomNav.share'), icon: <Share2 />, active: at('/share'), onSelect: () => navigate('/share') },
  ].filter(Boolean) as Tab[];

  return (
    <>
      <nav
        aria-label={t('merchant.bottomNav.label')}
        className="shrink-0 border-t border-border bg-card pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map((tab) => (
            <li key={tab.key}>
              <button
                type="button"
                onClick={tab.onSelect}
                aria-current={tab.active ? 'page' : undefined}
                className={`flex min-h-[56px] w-full flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                  tab.active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span aria-hidden="true" className={`[&>svg]:h-5 [&>svg]:w-5 ${tab.active ? '[&>svg]:stroke-[2.4]' : ''}`}>{tab.icon}</span>
                <span className={`max-w-full truncate ${tab.active ? 'font-semibold' : ''}`}>{tab.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <ResponsiveDialog
        open={posIntroOpen}
        onOpenChange={setPosIntroOpen}
        title={t('merchant.bottomNav.posIntroTitle')}
        description={t('merchant.bottomNav.posIntroBody')}
      >
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">{t('merchant.bottomNav.posIntroFirstTime')}</p>
          <button
            type="button"
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-foreground px-4 text-sm font-semibold text-background"
            onClick={() => {
              setPosIntroOpen(false);
              openPosApp();
            }}
          >
            {t('merchant.bottomNav.posIntroOpen')}
          </button>
          <button
            type="button"
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl px-4 text-sm font-semibold text-muted-foreground"
            onClick={() => setPosIntroOpen(false)}
          >
            {t('merchant.bottomNav.posIntroLater')}
          </button>
        </div>
      </ResponsiveDialog>
    </>
  );
}

export default MobileBottomBar;
