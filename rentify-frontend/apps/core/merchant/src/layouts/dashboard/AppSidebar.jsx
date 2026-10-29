import { useMediaQuery } from '@rentify/utils';
import { PanelLeftClose } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { Sheet, SheetContent } from '@rentify/shared/ui/sheet';
import { MARKETING_URL } from '@rentify/shared/config/urls';
import { NavMain } from './NavMain';
import { NavUser } from './NavUser';
import { useAccess } from '../../utils/access';
import React from 'react';

// How the Store sells, in plain words: Amazon-style marketplace, Shopify-style own site, or both
const channelMode = ({ hasMarketplace, hasStorefront }) => {
  if (hasMarketplace && hasStorefront) return 'Marketplace + online store';
  if (hasStorefront) return 'Online store';
  if (hasMarketplace) return 'Marketplace seller';
  return 'Getting started';
};

const ChannelDot = ({ on, label }) => (
  <span className="flex items-center gap-1.5" title={`${label}: ${on ? 'on' : 'off'}`}>
    <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-emerald-500' : 'bg-foreground/20'}`} />
    <span className={on ? 'text-foreground/70' : 'text-foreground/35'}>{label}</span>
  </span>
);

export function AppSidebar({
  tabs,
  currentTab,
  onTabChange,
  userData,
  onLogout,
  isOpen,
  setOpen,
  hasStorefront = true,
  channels = { hasStorefront: true, hasMarketplace: true, hasPos: true },
  store = null,
  searchFilter = '',
}) {
  const isMobile = useMediaQuery('(max-width: 900px)');
  const access = useAccess();

  const filteredTabs = searchFilter.trim()
    ? tabs.filter((t) => {
        const title = (t.displayName || t.label || t.name).toLowerCase();
        return title.includes(searchFilter.toLowerCase().trim());
      })
    : tabs;

  // Channels the Store doesn't use yet appear as a quiet "add" entry instead of a page
  const extraChannelItems = !hasStorefront && access.isOwner
    ? [{ key: 'add-online-store', action: true, label: 'Add online store', href: `${MARKETING_URL}/onboarding/starter?step=template` }]
    : [];

  const storeName = store?.name || 'Your store';

  const sidebarContent = (
    <aside className="flex h-full w-[272px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground select-none">
      {/* Brand */}
      <div className="flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-foreground text-background">
            <span className="text-[15px] font-bold">R</span>
          </div>
          <span className="text-[15px] font-semibold tracking-tight">Rentify</span>
        </div>
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            className="h-8 w-8 rounded-lg text-foreground/50 hover:text-foreground"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-[18px] w-[18px]" />
          </Button>
        )}
      </div>

      {/* Store + channel status */}
      <div className="mx-3 mt-2 rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sidebar-border bg-sidebar text-[13px] font-semibold shadow-sm">
            {storeName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold leading-tight">{storeName}</p>
            <p className="truncate text-[11.5px] text-muted-foreground">{channelMode(channels)}</p>
          </div>
          <span
            className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${
              access.isOwner ? 'bg-foreground text-background' : 'bg-card text-foreground/70'
            }`}
            title={access.isOwner ? 'Store owner: full access' : 'Staff: access set by the store owner'}
          >
            {access.isOwner ? 'Owner' : 'Staff'}
          </span>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium">
          <ChannelDot on={channels.hasMarketplace} label="Marketplace" />
          <ChannelDot on={channels.hasStorefront} label="Online store" />
          <ChannelDot on={channels.hasPos} label="POS" />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-subtle">
        <NavMain
          items={filteredTabs}
          currentTab={currentTab}
          onTabChange={(path) => {
            onTabChange(path);
            if (isMobile) setOpen(false);
          }}
          extraChannelItems={extraChannelItems}
        />
      </div>

      {/* Account */}
      <div className="px-3 pb-3">
        <NavUser user={userData} onLogout={onLogout} />
      </div>
    </aside>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[272px] p-0">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  return isOpen ? sidebarContent : null;
}

export default AppSidebar;
