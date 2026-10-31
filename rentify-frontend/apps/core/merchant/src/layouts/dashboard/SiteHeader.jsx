import { useMediaQuery, useTranslation } from '@rentify/utils';
import { ChevronDown, ExternalLink, Globe, Menu, MonitorSmartphone, Search, ShoppingBag, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@rentify/shared/ui/dropdown-menu';
import { HOSTED_STOREFRONT_DOMAIN, MARKETPLACE_URL, POS_URL } from '@rentify/shared/config/urls';
import { useChannels } from '../../context/ChannelContext';
import { ChannelViewSwitcher } from '../../components/ChannelViewSwitcher';
import { useAccess } from '../../utils/access';
import { Button } from '@rentify/shared/ui/button';
import { SheetTrigger } from '@rentify/shared/ui/sheet';
import { Input } from '@rentify/shared/ui/input';
import { NotificationDropdown } from './NotificationDropdown';
import { LanguageSwitcher } from '@rentify/shared/layouts/main/LanguageSwitcher';
import React, { useState, useRef, useEffect } from 'react';

export function SiteHeader({
  onSidebarToggle,
  isSidebarOpen = true,
  tabs = [],
  onTabChange,
  searchFilter = '',
  setSearchFilter,
  hasPos = false,
}) {
  const { t, lang, setLanguage } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 900px)');
  const access = useAccess();
  const { store, hasStorefront } = useChannels();
  const rawSlug = String(store?.slug || '').trim();
  const slugOk = rawSlug && !/^store-[0-9a-f-]{20,}$/i.test(rawSlug);
  const shopRef = store?.id || rawSlug;
  const shopHref = shopRef ? `${(MARKETPLACE_URL || '').replace(/\/+$/, '')}/stores/${shopRef}` : null;
  const siteHost = store?.websiteDomain || (slugOk ? `${rawSlug}.${HOSTED_STOREFRONT_DOMAIN || 'mekhla.digital'}` : null);
  // Local dev hosts (x.localhost:4900) serve plain http
  const siteHref = hasStorefront && siteHost
    ? (/^https?:\/\//.test(siteHost) ? siteHost : `${/localhost|127\.0\.0\.1/.test(siteHost) ? 'http' : 'https'}://${siteHost}`)
    : null;
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  // Phones: search is an icon that opens a full-width bar over the header,
  // so the action buttons keep their room instead of squashing the input.
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  useEffect(() => {
    if (mobileSearchOpen) searchInputRef.current?.focus();
  }, [mobileSearchOpen]);

  const filteredTabs = searchFilter.trim()
    ? tabs.filter((t) => {
        const title = (t.displayName || t.label || t.name).toLowerCase();
        return title.includes(searchFilter.toLowerCase().trim());
      })
    : [];

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setIsSearchFocused(false);
        setMobileSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectTab = (tabPath) => {
    onTabChange?.(tabPath);
    setSearchFilter?.('');
    setIsSearchFocused(false);
    setMobileSearchOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsSearchFocused(false);
      setMobileSearchOpen(false);
      e.target.blur();
    } else if (e.key === 'Enter' && filteredTabs.length > 0) {
      handleSelectTab(filteredTabs[0].path);
      e.target.blur();
    }
  };

  const sidebarButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={isMobile ? undefined : onSidebarToggle}
      className="h-10 w-10 rounded-xl shrink-0"
      aria-label={t('merchant.shell.expandSidebar')}
      title={t('merchant.shell.expandSidebar')}
    >
      <Menu className="h-5 w-5" />
    </Button>
  );

  return (
    <>
    <header className="relative flex h-16 shrink-0 items-center justify-between gap-3 bg-background/80 px-4 text-foreground backdrop-blur-md md:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3 xl:max-w-sm">
        {(!isSidebarOpen || isMobile) && (
          isMobile ? <SheetTrigger asChild>{sidebarButton}</SheetTrigger> : sidebarButton
        )}

        {/* Search Bar on the Left (over the former overview text area) */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl sm:hidden"
          aria-label={t('merchant.shell.searchPages')}
          aria-expanded={mobileSearchOpen}
          onClick={() => setMobileSearchOpen(true)}
        >
          <Search className="h-5 w-5" />
        </Button>

        <div
          ref={searchContainerRef}
          className={
            mobileSearchOpen
              ? 'absolute inset-x-4 top-3 z-40 sm:relative sm:inset-auto sm:top-auto sm:w-full sm:max-w-lg'
              : 'relative hidden w-full max-w-md sm:block sm:max-w-lg'
          }
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
          <Input
            ref={searchInputRef}
            type="search"
            value={searchFilter}
            onChange={(e) => {
              setSearchFilter?.(e.target.value);
              setIsSearchFocused(true);
            }}
            onFocus={() => setIsSearchFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder={t('merchant.shell.searchPagesPlaceholder')}
            className="w-full bg-card pl-10 pr-9 h-10 rounded-xl border-transparent [box-shadow:var(--shadow-soft)] text-sm placeholder:text-muted-foreground/70 focus-visible:bg-background shadow-none [&::-webkit-search-cancel-button]:hidden"
          />
          {(searchFilter || mobileSearchOpen) && (
            <button
              type="button"
              onClick={() => {
                setSearchFilter?.('');
                setIsSearchFocused(false);
                setMobileSearchOpen(false);
              }}
              className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:text-foreground"
              aria-label={t('merchant.shell.clearSearch')}
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Quick Menu Results Dropdown */}
          {isSearchFocused && searchFilter.trim() && (
            <div className="absolute left-0 top-full mt-1.5 w-full rounded-xl bg-popover text-popover-foreground shadow-lg overflow-hidden z-50 py-1.5 max-h-80 overflow-y-auto scrollbar-subtle">
              {filteredTabs.length > 0 ? (
                filteredTabs.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      type="button"
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-xs sm:text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectTab(item.path);
                      }}
                    >
                      {Icon && (
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="flex-1 truncate">
                        <span className="font-medium text-foreground">
                          {item.displayName || item.label || item.name}
                        </span>
                        {item.section && (
                          <span className="text-[11px] text-muted-foreground ml-2 capitalize">
                            ({item.section})
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-3 text-center text-xs text-muted-foreground">
                  {t('merchant.shell.noMenuFound')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Channel focus: centred on wide screens, its own row below on smaller ones */}
      <ChannelViewSwitcher className="hidden xl:flex" />

      <div className="ml-auto flex shrink-0 items-center justify-end gap-2">
        {(shopHref || siteHref) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t('merchant.shell.viewStore')}
                className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-card px-3.5 text-[13px] font-semibold text-foreground [box-shadow:var(--shadow-soft)] transition-colors hover:bg-muted/60"
              >
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">{t('merchant.shell.viewStore')}</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" collisionPadding={16} className="w-72">
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                {t('merchant.shell.seeAsBuyers')}
              </DropdownMenuLabel>
              {siteHref && (
                <DropdownMenuItem asChild>
                  <a href={siteHref} target="_blank" rel="noreferrer" className="flex min-h-11 cursor-pointer items-start gap-3">
                    <Globe className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-medium">{t('merchant.shell.onlineStore')}</span>
                      <span className="block truncate text-xs text-muted-foreground">{siteHost}</span>
                    </span>
                  </a>
                </DropdownMenuItem>
              )}
              {shopHref && (
                <DropdownMenuItem asChild>
                  <a href={shopHref} target="_blank" rel="noreferrer" className="flex min-h-11 cursor-pointer items-start gap-3">
                    <ShoppingBag className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="block font-medium">{t('merchant.shell.marketplacePage')}</span>
                      <span className="block text-xs text-muted-foreground">
                        {store?.marketplaceApprovalStatus && store.marketplaceApprovalStatus !== 'approved'
                          ? t('merchant.shell.publicOnceApproved')
                          : t('merchant.shell.yourStoreOnMarketplace')}
                      </span>
                    </span>
                  </a>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {hasPos && access.can('manage_pos') && (
          <a
            href={POS_URL}
            target="_blank"
            rel="noreferrer"
            aria-label={t('merchant.shell.openPos')}
            className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-foreground px-3.5 text-[13px] font-semibold text-background transition-opacity hover:opacity-90"
          >
            <MonitorSmartphone className="h-4 w-4" />
            <span className="hidden sm:inline">{t('merchant.shell.openPos')}</span>
          </a>
        )}
        <LanguageSwitcher value={lang} onChange={setLanguage} compact={isMobile} label={t('merchant.shell.language')} />
        <NotificationDropdown onTabChange={onTabChange} />
      </div>
    </header>
    <div className="shrink-0 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:px-8 xl:hidden">
      <ChannelViewSwitcher />
    </div>
    </>
  );
}

export default SiteHeader;
