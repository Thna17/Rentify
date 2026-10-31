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
import { useAccess } from '../../utils/access';
import { Button } from '@rentify/shared/ui/button';
import { SheetTrigger } from '@rentify/shared/ui/sheet';
import { Input } from '@rentify/shared/ui/input';
import { NotificationDropdown } from './NotificationDropdown';
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function SiteHeader({
  onSidebarToggle,
  isSidebarOpen = true,
  tabs = [],
  onTabChange,
  searchFilter = '',
  setSearchFilter,
}) {
  const { t, lang, setLanguage } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 900px)');
  const access = useAccess();
  const { profile, role, handleLogout } = useAuth();
  const { store } = useChannels();
  const storeName = store?.name || 'Rentify';

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (mobileSearchOpen) searchInputRef.current?.focus();
  }, [mobileSearchOpen]);

  const filteredTabs = searchFilter.trim()
    ? tabs.filter((item) => {
        const title = (item.displayName || item.label || item.name || '').toLowerCase();
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

  return (
    <header className="relative flex h-16 shrink-0 items-center justify-between gap-3 bg-background/80 px-4 text-foreground backdrop-blur-md md:px-8 border-b border-border/40">
      {/* Left: Mobile hamburger + store brand, or Desktop sidebar toggle + brand */}
      <div className="flex min-w-0 items-center gap-3">
        {isMobile ? (
          <SheetTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl shrink-0 text-foreground/70 hover:text-foreground"
              aria-label={t('merchant.shell.expandSidebar')}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
        ) : (
          !isSidebarOpen && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onSidebarToggle}
              className="h-10 w-10 rounded-xl shrink-0 text-foreground/70 hover:text-foreground"
              aria-label={t('merchant.shell.expandSidebar')}
              title={t('merchant.shell.expandSidebar')}
            >
              <PanelLeft className="h-5 w-5" />
            </Button>
          )
        )}

        {/* Brand Lockup: mark + name */}
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
      </div>

      {/* Center: Search Bar on Desktop; full-width bar on Mobile when active */}
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

        {/* Search Results Dropdown */}
        {isSearchFocused && searchFilter.trim() && (
          <div className="absolute left-0 top-full mt-1.5 w-full rounded-xl bg-popover text-popover-foreground shadow-lg overflow-hidden z-50 py-1.5 max-h-80 overflow-y-auto scrollbar-subtle border border-border">
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
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <div className="flex-1 truncate">
                      <span className="font-medium text-foreground">{item.displayName || item.label || item.name}</span>
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

      {/* Right: Mobile search trigger + Notifications + User Account avatar dropdown */}
      <div className="flex shrink-0 items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-xl sm:hidden text-muted-foreground hover:text-foreground"
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
              className="relative h-10 w-10 rounded-xl p-0 hover:bg-accent focus-visible:ring-1 cursor-pointer"
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
                className="cursor-pointer h-10 text-xs sm:text-sm"
                onClick={() => setLanguage(lang === 'kh' || lang === 'km' ? 'en' : 'kh')}
              >
                <Globe className="mr-2.5 h-4 w-4 text-muted-foreground" />
                <span>{lang === 'kh' || lang === 'km' ? 'English (ប្តូរ)' : 'ភាសាខ្មែរ (Switch)'}</span>
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
  );
}

export default SiteHeader;
