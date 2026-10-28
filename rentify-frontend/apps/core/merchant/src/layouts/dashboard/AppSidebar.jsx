import { useMediaQuery, useTranslation } from '@rentify/utils';
import { Menu, Store } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@rentify/shared/ui/sheet';
import { Badge } from '@rentify/shared/ui/badge';
import { MARKETING_URL } from '@rentify/shared/config/urls';
import { NavMain } from './NavMain';
import { NavUser } from './NavUser';
import React from 'react';

export function AppSidebar({
  tabs,
  currentTab,
  onTabChange,
  userData,
  onLogout,
  isOpen,
  setOpen,
  hasStorefront = true,
  searchFilter = '',
  store,
}) {
  const isMobile = useMediaQuery('(max-width: 900px)');
  const { t } = useTranslation();
  const storeName = store?.name || t('dashboard.shell.your_store');
  const approvalStatus = store?.marketplaceApprovalStatus || 'active';
  const statusVariant = approvalStatus === 'approved' || approvalStatus === 'active'
    ? 'success'
    : approvalStatus === 'rejected' ? 'danger' : 'warning';
  const statusKey = `dashboard.shell.status.${approvalStatus}`;
  const translatedStatus = t(statusKey);
  const statusLabel = translatedStatus === statusKey
    ? approvalStatus.replaceAll('_', ' ')
    : translatedStatus;

  const filteredTabs = searchFilter.trim()
    ? tabs.filter((t) => {
        const title = (t.displayName || t.label || t.name).toLowerCase();
        return title.includes(searchFilter.toLowerCase().trim());
      })
    : tabs;

  const sidebarContent = (
    <aside className="flex h-full w-[272px] max-w-[88vw] flex-col border-r border-border/60 bg-card text-foreground select-none" aria-label={t('dashboard.shell.workspace_navigation')}>
      {/* Header */}
      <div className="p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm">
            <span className="text-base font-bold text-primary-foreground">
              R
            </span>
          </div>
          <div>
            <span className="text-base font-semibold leading-tight block">Rentify</span>
            <span className="text-[11px] text-muted-foreground leading-none block">{t('dashboard.shell.merchant_workspace')}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(false)}
          className="h-8 w-8 rounded-md opacity-70 hover:opacity-100"
          aria-label={t('dashboard.shell.close_navigation')}
          title={t('dashboard.shell.close_navigation')}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="mx-3 rounded-xl border border-border/70 bg-muted/45 px-3 py-2.5" aria-label={t('dashboard.shell.active_store')}>
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Store className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{t('dashboard.shell.active_store')}</p>
            <p className="break-words text-sm font-semibold leading-5">{storeName}</p>
            <Badge variant={statusVariant} className="mt-1 capitalize">{statusLabel}</Badge>
          </div>
        </div>
      </div>

      {/* Navigation Content */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 scrollbar-subtle">
        <NavMain
          items={filteredTabs}
          currentTab={currentTab}
          onTabChange={onTabChange}
        />
      </div>

      {/* Storefront Upsell for Marketplace-only Merchants */}
      {!hasStorefront && (
        <div className="mx-3 mb-3 p-3 rounded-xl bg-primary/[0.06] dark:bg-blue-950/30 text-xs">
          <div className="font-semibold text-blue-950 dark:text-blue-300 flex items-center gap-1.5 mb-1">
            <Store className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            {t('dashboard.shell.launch_storefront')}
          </div>
          <p className="text-slate-600 dark:text-slate-400 mb-2 leading-relaxed text-[11px]">
            {t('dashboard.shell.launch_storefront_description')}
          </p>
          <a
            href={`${MARKETING_URL}/onboarding/starter?step=template`}
            className="inline-block text-center font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-2.5 w-full transition-colors text-xs shadow-sm"
          >
            {t('dashboard.shell.get_storefront')}
          </a>
        </div>
      )}

      {/* User Section */}
      <div className="p-3 bg-card">
        <NavUser user={userData} onLogout={onLogout} />
      </div>
    </aside>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[288px] max-w-[88vw] gap-0 p-0">
          <SheetTitle className="sr-only">{t('dashboard.shell.mobile_navigation')}</SheetTitle>
          <SheetDescription className="sr-only">{t('dashboard.shell.mobile_navigation_description')}</SheetDescription>
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  return isOpen ? sidebarContent : null;
}

export default AppSidebar;
