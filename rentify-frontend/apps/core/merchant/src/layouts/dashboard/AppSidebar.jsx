import { useMediaQuery } from '@rentify/utils';
import { Menu, Store } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { Sheet, SheetContent } from '@rentify/shared/ui/sheet';
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
}) {
  const isMobile = useMediaQuery('(max-width: 900px)');

  const filteredTabs = searchFilter.trim()
    ? tabs.filter((t) => {
        const title = (t.displayName || t.label || t.name).toLowerCase();
        return title.includes(searchFilter.toLowerCase().trim());
      })
    : tabs;

  const sidebarContent = (
    <div className="flex h-full flex-col bg-card text-foreground w-[244px] border-r border-border/60 select-none">
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
            <span className="text-[11px] text-muted-foreground leading-none block">Merchant Hub</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(false)}
          className="h-8 w-8 rounded-md opacity-70 hover:opacity-100"
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>
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
            Launch Storefront
          </div>
          <p className="text-slate-600 dark:text-slate-400 mb-2 leading-relaxed text-[11px]">
            Add a branded website with your custom domain.
          </p>
          <a
            href={`${MARKETING_URL}/start`}
            className="inline-block text-center font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md py-1 px-2.5 w-full transition-colors text-xs shadow-sm"
          >
            Get Storefront
          </a>
        </div>
      )}

      {/* User Section */}
      <div className="p-3 bg-card">
        <NavUser user={userData} onLogout={onLogout} />
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-[270px]">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  return isOpen ? sidebarContent : null;
}

export default AppSidebar;