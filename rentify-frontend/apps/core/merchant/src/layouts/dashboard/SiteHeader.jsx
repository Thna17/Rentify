import { useMediaQuery, useTranslation } from '@rentify/utils';
import { Languages, Menu, Search, X } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import { NotificationDropdown } from './NotificationDropdown';
import React, { useState, useRef, useEffect } from 'react';

export function SiteHeader({
  onSidebarToggle,
  isSidebarOpen = true,
  tabs = [],
  onTabChange,
  searchFilter = '',
  setSearchFilter,
  currentTab,
  store,
}) {
  const isMobile = useMediaQuery('(max-width: 900px)');
  const { t, language, setLanguage } = useTranslation();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef(null);

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
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectTab = (tab) => {
    if (tab.externalHref) {
      window.open(tab.externalHref, '_blank', 'noopener,noreferrer');
    } else {
      onTabChange?.(tab.path);
    }
    setSearchFilter?.('');
    setIsSearchFocused(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsSearchFocused(false);
      e.target.blur();
    } else if (e.key === 'Enter' && filteredTabs.length > 0) {
      handleSelectTab(filteredTabs[0]);
      e.target.blur();
    }
  };

  return (
    <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/95 px-3 py-2 text-foreground backdrop-blur-md sm:px-4 md:px-6">
      <div className="flex items-center gap-3 flex-1 max-w-xl min-w-0">
        {(!isSidebarOpen || isMobile) && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onSidebarToggle}
            className="h-9 w-9 rounded-md shrink-0"
            aria-label={t('dashboard.shell.open_navigation')}
            title={t('dashboard.shell.open_navigation')}
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <div className="min-w-0 sm:hidden">
          <p className="truncate text-sm font-semibold">{currentTab?.displayName || currentTab?.label}</p>
          <p className="truncate text-xs text-muted-foreground">{store?.name || t('dashboard.shell.your_store')}</p>
        </div>

        <div className="relative hidden w-full max-w-md sm:block sm:max-w-lg" ref={searchContainerRef}>
          <label htmlFor="merchant-navigation-search" className="sr-only">{t('dashboard.shell.search_navigation')}</label>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
          <Input
            id="merchant-navigation-search"
            type="search"
            value={searchFilter}
            onChange={(e) => {
              setSearchFilter?.(e.target.value);
              setIsSearchFocused(true);
            }}
            onFocus={() => setIsSearchFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder={t('dashboard.shell.search_navigation')}
            className="w-full bg-card pl-10 pr-9 h-10 rounded-xl border-transparent [box-shadow:var(--shadow-soft)] text-sm placeholder:text-muted-foreground/70 focus-visible:bg-background shadow-none [&::-webkit-search-cancel-button]:hidden"
          />
          {searchFilter && (
            <button
              type="button"
              onClick={() => {
                setSearchFilter?.('');
                setIsSearchFocused(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-sm"
              aria-label={t('dashboard.shell.clear_search')}
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
                        handleSelectTab(item);
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
                  {t('dashboard.shell.no_navigation_results')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLanguage(language === 'en' ? 'kh' : 'en')}
          className="min-h-10 min-w-10 gap-1.5 rounded-lg px-2"
          aria-label={t('dashboard.shell.change_language')}
          title={t('dashboard.shell.change_language')}
        >
          <Languages className="h-4 w-4" aria-hidden="true" />
          <span className="hidden text-xs font-semibold md:inline">{language === 'en' ? 'ខ្មែរ' : 'EN'}</span>
        </Button>
        <NotificationDropdown onTabChange={onTabChange} />
      </div>
    </header>
  );
}

export default SiteHeader;
