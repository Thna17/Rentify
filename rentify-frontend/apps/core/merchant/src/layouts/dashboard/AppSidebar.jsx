import { useMediaQuery } from '@rentify/utils';
import { Search, X, Store } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { Sheet, SheetContent } from '@rentify/shared/ui/sheet';
import { Input } from '@rentify/shared/ui/input';
import { MARKETING_URL } from '@rentify/shared/config/urls';
import { NavMain } from './NavMain';
import { NavUser } from './NavUser';
import React, { useState } from 'react';

export function AppSidebar({
  tabs,
  currentTab,
  onTabChange,
  userData,
  onLogout,
  isOpen,
  setOpen,
  hasStorefront = true,
}) {
  const isMobile = useMediaQuery('(max-width: 900px)');
  const [searchFilter, setSearchFilter] = useState('');

  const filteredTabs = searchFilter.trim()
    ? tabs.filter((t) => {
        const title = (t.displayName || t.label || t.name).toLowerCase();
        return title.includes(searchFilter.toLowerCase().trim());
      })
    : tabs;

  const sidebarContent = (
    <div className="flex h-full flex-col bg-background text-foreground w-[270px] border-r border-border select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-border flex items-center justify-between">
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
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            className="h-7 w-7 rounded-md opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="p-2.5 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground/70" />
          <Input
            type="search"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search menu..."
            className="w-full bg-muted/40 pl-8 h-8 rounded-md border-border text-xs focus-visible:bg-background"
          />
        </div>
      </div>

      {/* Navigation Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3.5">
        <NavMain
          items={filteredTabs}
          currentTab={currentTab}
          onTabChange={onTabChange}
        />
      </div>

      {/* Storefront Upsell for Marketplace-only Merchants */}
      {!hasStorefront && (
        <div className="mx-3 mb-3 p-3 rounded-xl border border-blue-200 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-900 text-xs">
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
      <div className="p-3 border-t border-border bg-background">
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