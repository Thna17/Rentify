import { useTranslation } from '@rentify/utils';
import { X } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { SheetContent, SheetTitle } from '@rentify/shared/ui/sheet';
import { NavMain } from './NavMain';
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
  store = null,
  searchFilter = '',
  isMobile = false,
}) {
  const { t } = useTranslation();
  const storeName = store?.name || 'Rentify';

  const filteredTabs = searchFilter.trim()
    ? tabs.filter((item) => {
        const title = (item.displayName || item.label || item.name || '').toLowerCase();
        return title.includes(searchFilter.toLowerCase().trim());
      })
    : tabs;

  const sidebarContent = (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground select-none">
      {/* Brand Header at top of sidebar */}
      <div className="flex h-16 shrink-0 items-center justify-between px-4 sm:px-5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-foreground text-background text-[15px] font-bold shadow-xs">
            {store?.logoUrl ? (
              <img src={store.logoUrl} alt={storeName} className="h-full w-full object-contain rounded-[10px]" />
            ) : (
              'R'
            )}
          </div>
          <div className="min-w-0 flex items-baseline gap-2">
            <span className="text-[15px] font-semibold tracking-tight">Rentify</span>
            <span className="truncate text-sm font-medium text-muted-foreground max-w-[110px]">
              {storeName}
            </span>
          </div>
        </div>

        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            className="h-11 w-11 rounded-xl text-foreground/60 hover:text-foreground shrink-0"
            aria-label={t('merchant.shell.closeMenu')}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-subtle">
        <NavMain
          items={filteredTabs}
          currentTab={currentTab}
          onTabChange={(path) => {
            onTabChange(path);
            if (isMobile) setOpen(false);
          }}
        />
      </div>
    </aside>
  );

  if (isMobile) {
    return (
      <SheetContent id="merchant-mobile-navigation" side="left" aria-describedby={undefined} className="w-[260px] p-0">
        <SheetTitle className="sr-only">{t('merchant.shell.sidebarNavigation')}</SheetTitle>
        {sidebarContent}
      </SheetContent>
    );
  }

  return isOpen ? sidebarContent : null;
}

export default AppSidebar;
