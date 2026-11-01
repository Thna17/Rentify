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

  const filteredTabs = searchFilter.trim()
    ? tabs.filter((item) => {
        const title = (item.displayName || item.label || item.name || '').toLowerCase();
        return title.includes(searchFilter.toLowerCase().trim());
      })
    : tabs;


  const sidebarContent = (
    <aside className="flex h-full w-[248px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground select-none">
      {isMobile && (
        <div className="flex h-14 items-center justify-end px-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            className="h-11 w-11 rounded-xl text-foreground/60 hover:text-foreground"
            aria-label={t('merchant.shell.closeMenu')}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 pt-1.5 pb-4 scrollbar-subtle">
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
