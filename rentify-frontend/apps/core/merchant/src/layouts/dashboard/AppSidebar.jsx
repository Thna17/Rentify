import { useChannels } from '../../context/ChannelContext';
import { useTranslation } from '@rentify/utils';
import { PanelLeftClose, X } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { SheetContent, SheetTitle } from '@rentify/shared/ui/sheet';
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
  isMobile = false,
}) {
  const { t } = useTranslation();
  const access = useAccess();
  const { view } = useChannels();

  const filteredTabs = searchFilter.trim()
    ? tabs.filter((t) => {
        const title = (t.displayName || t.label || t.name).toLowerCase();
        return title.includes(searchFilter.toLowerCase().trim());
      })
    : tabs;

  // Channels the Store doesn't use yet appear as a quiet "add" entry instead of a page
  const extraChannelItems = view === 'all' && !hasStorefront && access.isOwner
    ? [{ key: 'add-online-store', action: true, label: 'Add online store', href: `${MARKETING_URL}/onboarding/starter?step=template` }]
    : [];

  const storeName = store?.name || 'Your store';

  const sidebarContent = (
    <div className="flex h-full w-[260px] flex-col bg-card text-foreground select-none">
      {/* Brand */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-foreground text-background">
            <span className="text-[15px] font-bold">R</span>
          </div>
          <span className="text-[15px] font-semibold tracking-tight">Rentify</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(false)}
          className={isMobile ? 'h-10 w-10 rounded-xl text-foreground/60 hover:text-foreground' : 'h-8 w-8 rounded-lg text-foreground/50 hover:text-foreground'}
          aria-label={isMobile ? 'Close menu' : 'Collapse sidebar'}
          title={isMobile ? 'Close menu' : 'Collapse sidebar'}
        >
          {isMobile ? <X className="h-5 w-5" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
        </Button>
      </div>

      {/* Store + channel status */}
      <div className="mx-3 mt-4 rounded-2xl bg-muted/70 p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card text-[13px] font-semibold shadow-sm">
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
          <ChannelDot on={channels.hasMarketplace} label={t('merchant.shell.marketplace')} />
          <ChannelDot on={channels.hasStorefront} label={t('merchant.shell.onlineStore')} />
          <ChannelDot on={channels.hasPos} label="POS" />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-5 scrollbar-subtle">
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
    </div>
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
