import { useMediaQuery, useTranslation, useAuth } from '@rentify/utils';
import {
  Menu,
  Search,
  X,
  PanelLeft,
  Globe,
  User,
  CreditCard,
  LogOut,
  SlidersHorizontal,
  Package,
  ShoppingBag,
  ChevronDown,
  ExternalLink,
  MonitorSmartphone,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@rentify/shared/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@rentify/shared/ui/avatar';
import { useChannels } from '../../context/ChannelContext';
import { ChannelViewSwitcher, useHasChannelChoice } from '../../components/ChannelViewSwitcher';
import { HOSTED_STOREFRONT_DOMAIN, MARKETPLACE_URL, POS_URL } from '@rentify/shared/config/urls';
import { useAccess } from '../../utils/access';
import { useChannelOrders, formatMoney } from '../../hooks/useChannelOrders';
import { useGetManagedProductsQuery } from '@rentify/apis';
import { useThemeService } from '@rentify/shared/hooks/useThemeService';
import { Button } from '@rentify/shared/ui/button';
import { SheetTrigger } from '@rentify/shared/ui/sheet';
import { Input } from '@rentify/shared/ui/input';
import { NotificationDropdown } from './NotificationDropdown';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 900px)');
  const access = useAccess();
  const { profile, role, handleLogout } = useAuth();
  const { store, hasStorefront } = useChannels();
  const storeName = store?.name || 'Rentify';
  const hasChannelChoice = useHasChannelChoice();
  const isKhmer = lang === 'kh' || lang === 'km';

  // "View store": where buyers see this Store (marketplace page, online store)
  const rawSlug = String(store?.slug || '').trim();
  const slugOk = rawSlug && !/^store-[0-9a-f-]{20,}$/i.test(rawSlug);
  const shopRef = store?.id || rawSlug;
  const shopHref = shopRef ? `${(MARKETPLACE_URL || '').replace(/\/+$/, '')}/stores/${shopRef}` : null;
  const siteHost = store?.websiteDomain || (slugOk ? `${rawSlug}.${HOSTED_STOREFRONT_DOMAIN || 'mekhla.digital'}` : null);
  // Local dev hosts (x.localhost:4900) serve plain http
  const siteHref = hasStorefront && siteHost
    ? (/^https?:\/\//.test(siteHost) ? siteHost : `${/localhost|127\.0\.0\.1/.test(siteHost) ? 'http' : 'https'}://${siteHost}`)
    : null;

  const { websiteData } = useThemeService();
  const websiteId = websiteData?.websiteId;
  const { orders } = useChannelOrders('all');
  const { data: productsData } = useGetManagedProductsQuery(
    { websiteId, page: 1, limit: 50 },
    { skip: !websiteId }
  );

  const products = useMemo(() => {
    if (!productsData) return [];
    if (Array.isArray(productsData)) return productsData;
    if (Array.isArray(productsData.products)) return productsData.products;
    if (Array.isArray(productsData.data)) return productsData.data;
    return [];
  }, [productsData]);

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (mobileSearchOpen) searchInputRef.current?.focus();
  }, [mobileSearchOpen]);

  // Wireframe M27: Search pages, products, and orders
  const filteredTabs = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return [];
    return tabs.filter((item) => {
      const title = (item.displayName || item.label || item.name || '').toLowerCase();
      return title.includes(q);
    });
  }, [tabs, searchFilter]);

  const matchingProducts = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => {
        const name = (p.name || p.title || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        return name.includes(q) || cat.includes(q);
      })
      .slice(0, 3);
  }, [products, searchFilter]);

  const matchingOrders = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return [];
    return orders
      .filter((o) => {
        const num = (o.orderNumber || o.id || '').toLowerCase();
        const name = (o.customer?.name || o.buyerName || '').toLowerCase();
        const phone = (o.customer?.phone || o.buyerPhone || '').toLowerCase();
        return num.includes(q) || name.includes(q) || phone.includes(q);
      })
      .slice(0, 3);
  }, [orders, searchFilter]);

  const hasAnyMatches = filteredTabs.length > 0 || matchingProducts.length > 0 || matchingOrders.length > 0;

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

  const handleSelectProduct = (product) => {
    navigate(product.id ? `/products/edit/${product.id}` : '/products');
    setSearchFilter?.('');
    setIsSearchFocused(false);
    setMobileSearchOpen(false);
  };

  const handleSelectOrder = (order) => {
    navigate(order.id ? `/orders/${order.id}` : '/orders');
    setSearchFilter?.('');
    setIsSearchFocused(false);
    setMobileSearchOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsSearchFocused(false);
      setMobileSearchOpen(false);
      e.target.blur();
    } else if (e.key === 'Enter') {
      if (filteredTabs.length > 0) {
        handleSelectTab(filteredTabs[0].path);
      } else if (matchingProducts.length > 0) {
        handleSelectProduct(matchingProducts[0]);
      } else if (matchingOrders.length > 0) {
        handleSelectOrder(matchingOrders[0]);
      }
      e.target.blur();
    }
  };

  return (
    <>
    <header className="relative flex h-16 shrink-0 items-center justify-between gap-3 bg-background/80 px-4 text-foreground backdrop-blur-md md:px-8 border-b border-border/40">
      {/* Left: Mobile hamburger + store brand, or Desktop sidebar toggle + brand when collapsed, plus Search Bar */}
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        {isMobile ? (
          <>
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-xl shrink-0 text-foreground/70 hover:text-foreground"
                aria-label={t('merchant.shell.expandSidebar')}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-foreground text-background text-[15px] font-bold shadow-xs">
                {store?.logoUrl ? (
                  <img src={store.logoUrl} alt={storeName} className="h-full w-full object-contain rounded-[10px]" />
                ) : (
                  'R'
                )}
              </div>
              <div className="min-w-0 flex items-baseline gap-2">
                <span className="text-[15px] font-semibold tracking-tight hidden sm:inline">Rentify</span>
                <span className="truncate text-sm font-medium text-muted-foreground max-w-[140px]">
                  {storeName}
                </span>
              </div>
            </div>
          </>
        ) : (
          !isSidebarOpen && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onSidebarToggle}
                className="h-11 w-11 rounded-xl shrink-0 text-foreground/70 hover:text-foreground"
                aria-label={t('merchant.shell.expandSidebar')}
                title={t('merchant.shell.expandSidebar')}
              >
                <PanelLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-foreground text-background text-[15px] font-bold shadow-xs">
                  {store?.logoUrl ? (
                    <img src={store.logoUrl} alt={storeName} className="h-full w-full object-contain rounded-[10px]" />
                  ) : (
                    'R'
                  )}
                </div>
                <div className="min-w-0 flex items-baseline gap-2">
                  <span className="text-[15px] font-semibold tracking-tight hidden sm:inline">Rentify</span>
                  <span className="truncate text-sm font-medium text-muted-foreground max-w-[140px] sm:max-w-[200px]">
                    {storeName}
                  </span>
                </div>
              </div>
            </>
          )
        )}

        {/* Search Bar on Left side */}
        <div
          ref={searchContainerRef}
        className={
          mobileSearchOpen
            ? 'absolute inset-x-4 top-3 z-40 sm:relative sm:inset-auto sm:top-auto sm:w-full sm:max-w-md'
            : 'relative hidden w-full max-w-sm sm:block sm:max-w-md'
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
          placeholder={t('merchant.shell.searchPagesPlaceholder') || 'Search orders, products, customers…'}
          className="w-full bg-card pl-10 pr-9 h-10 rounded-xl border border-input text-sm placeholder:text-muted-foreground/70 shadow-xs focus-visible:ring-1 focus-visible:ring-ring [&::-webkit-search-cancel-button]:hidden"
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

        {/* Search Results Dropdown - Wireframe Screen M27 */}
        {isSearchFocused && searchFilter.trim() && (
          <div className="absolute left-0 top-full mt-1.5 w-full rounded-2xl bg-popover text-popover-foreground shadow-lift overflow-hidden z-50 py-2 max-h-96 overflow-y-auto scrollbar-subtle border border-card-border">
            {hasAnyMatches ? (
              <>
                {/* Products Group */}
                {matchingProducts.length > 0 && (
                  <div>
                    <div className="px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Products
                    </div>
                    {matchingProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full flex items-center justify-between gap-3 px-3.5 py-2 text-xs sm:text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectProduct(p);
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium text-foreground truncate">{p.name || p.title}</span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                          {formatMoney(Number(p.price || 0))}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Orders Group */}
                {matchingOrders.length > 0 && (
                  <div className={matchingProducts.length > 0 ? 'mt-1 pt-1 border-t border-border/50' : ''}>
                    <div className="px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Orders
                    </div>
                    {matchingOrders.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        className="w-full flex items-center justify-between gap-3 px-3.5 py-2 text-xs sm:text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectOrder(o);
                        }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <ShoppingBag className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0 truncate">
                            <span className="font-semibold text-foreground">
                              #{o.orderNumber || o.id?.slice(-6)}
                            </span>
                            <span className="text-muted-foreground text-xs ml-1.5 truncate">
                              {o.customer?.name || o.buyerName || 'Customer'}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-foreground shrink-0 tabular-nums">
                          {formatMoney(Number(o.totals?.total || 0))}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Pages Group */}
                {filteredTabs.length > 0 && (
                  <div className={matchingProducts.length > 0 || matchingOrders.length > 0 ? 'mt-1 pt-1 border-t border-border/50' : ''}>
                    <div className="px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Pages
                    </div>
                    {filteredTabs.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.path}
                          type="button"
                          className="w-full flex items-center gap-3 px-3.5 py-2 text-xs sm:text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectTab(item.path);
                          }}
                        >
                          {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
                          <div className="flex-1 truncate">
                            <span className="font-medium text-foreground">{item.displayName || item.label || item.name}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                No matches found for &ldquo;{searchFilter}&rdquo;
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Channel focus sits in the header on wide screens, in its own row below on smaller ones */}
      {hasChannelChoice && <ChannelViewSwitcher className="hidden 2xl:inline-flex" />}

      {/* Right: store links, POS, language, search on phones, notifications, account */}
      <div className="flex shrink-0 items-center justify-end gap-2">
        {(shopHref || siteHref) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                aria-label={t('merchant.shell.viewStore')}
                className="hidden h-11 rounded-xl px-3 text-sm font-semibold md:inline-flex"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                <span className="hidden xl:inline">{t('merchant.shell.viewStore')}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" collisionPadding={16} className="w-72 rounded-xl">
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                {t('merchant.shell.seeAsBuyers')}
              </DropdownMenuLabel>
              {siteHref && (
                <DropdownMenuItem asChild>
                  <a href={siteHref} target="_blank" rel="noreferrer" className="flex min-h-11 cursor-pointer items-start gap-3">
                    <Globe className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
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
                    <ShoppingBag className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
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
          <Button asChild className="hidden h-11 rounded-xl px-3 text-sm font-semibold md:inline-flex">
            <a href={POS_URL} target="_blank" rel="noreferrer" aria-label={t('merchant.shell.openPos')}>
              <MonitorSmartphone className="h-4 w-4" aria-hidden="true" />
              <span className="hidden xl:inline">{t('merchant.shell.openPos')}</span>
            </a>
          </Button>
        )}

        {/* Language: two words, each in its own language; on smaller screens it is in the account menu */}
        <div role="radiogroup" aria-label={t('merchant.shell.language')} className="hidden items-center gap-0.5 rounded-xl bg-muted p-0.5 lg:inline-flex">
          {[['en', 'English', false], ['kh', 'ខ្មែរ', true]].map(([code, label, khmer]) => {
            const active = khmer === isKhmer;
            return (
              <button
                key={code}
                type="button"
                role="radio"
                aria-checked={active}
                lang={khmer ? 'km' : 'en'}
                onClick={() => setLanguage(code)}
                className={`min-h-11 rounded-[10px] px-3 text-sm font-semibold transition-colors ${
                  active ? 'bg-card text-foreground shadow-[var(--shadow-soft)]' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-xl sm:hidden text-muted-foreground hover:text-foreground"
          aria-label={t('merchant.shell.searchPages')}
          aria-expanded={mobileSearchOpen}
          onClick={() => setMobileSearchOpen(true)}
        >
          <Search className="h-5 w-5" />
        </Button>

        <NotificationDropdown onTabChange={onTabChange} />

        {/* User Account Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-11 w-11 rounded-xl p-0 hover:bg-accent focus-visible:ring-1 cursor-pointer"
              aria-label={t('merchant.shell.account')}
            >
              <Avatar className="h-9 w-9 rounded-xl border border-border/60">
                <AvatarImage src={profile?.avatar || profile?.profileImage} alt={profile?.name} />
                <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-semibold text-xs">
                  {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" collisionPadding={16} className="w-60 rounded-xl shadow-lg">
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2.5 px-3 py-2 text-left">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={profile?.avatar || profile?.profileImage} alt={profile?.name} />
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                    {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-xs leading-tight min-w-0">
                  <span className="truncate font-semibold text-foreground">{profile?.name || 'User'}</span>
                  <span className="text-muted-foreground truncate">{profile?.email}</span>
                  <span className="mt-0.5 inline-block text-[10px] font-medium text-primary">
                    {access.isOwner ? 'Store Owner' : 'Staff'}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="cursor-pointer h-10 text-xs sm:text-sm lg:hidden"
                onClick={() => setLanguage(isKhmer ? 'en' : 'kh')}
              >
                <Globe className="mr-2.5 h-4 w-4 text-muted-foreground" />
                <span lang={isKhmer ? 'en' : 'km'}>{isKhmer ? 'English' : 'ខ្មែរ'}</span>
              </DropdownMenuItem>
              {access.isOwner && (
                <>
                  <DropdownMenuItem
                    className="cursor-pointer h-10 text-xs sm:text-sm"
                    onClick={() => navigate('/settings/account')}
                  >
                    <User className="mr-2.5 h-4 w-4 text-muted-foreground" />
                    <span>{t('merchant.shell.account')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer h-10 text-xs sm:text-sm"
                    onClick={() => navigate('/settings/billing')}
                  >
                    <CreditCard className="mr-2.5 h-4 w-4 text-muted-foreground" />
                    <span>{t('merchant.shell.billing')}</span>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem
                className="cursor-pointer h-10 text-xs sm:text-sm"
                onClick={() => navigate('/settings/preferences')}
              >
                <SlidersHorizontal className="mr-2.5 h-4 w-4 text-muted-foreground" />
                <span>Preferences</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer h-10 text-xs sm:text-sm text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2.5 h-4 w-4" />
              <span>{t('merchant.shell.logOut')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    {hasChannelChoice && (
      <div className="shrink-0 overflow-x-auto border-b border-border/40 bg-background/80 px-4 py-2 [scrollbar-width:none] md:px-8 2xl:hidden">
        <ChannelViewSwitcher />
      </div>
    )}
    </>
  );
}

export default SiteHeader;
