import { useMediaQuery } from '@rentify/utils';
import { Menu, MonitorSmartphone, Search, X } from 'lucide-react';
import { POS_URL } from '@rentify/shared/config/urls';
import { ChannelViewSwitcher } from '../../components/ChannelViewSwitcher';
import { useAccess } from '../../utils/access';
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
  hasPos = false,
}) {
  const isMobile = useMediaQuery('(max-width: 900px)');
  const access = useAccess();
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

  const handleSelectTab = (tabPath) => {
    onTabChange?.(tabPath);
    setSearchFilter?.('');
    setIsSearchFocused(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsSearchFocused(false);
      e.target.blur();
    } else if (e.key === 'Enter' && filteredTabs.length > 0) {
      handleSelectTab(filteredTabs[0].path);
      e.target.blur();
    }
  };

  return (
    <>
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 text-foreground backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3 xl:max-w-sm">
        {(!isSidebarOpen || isMobile) && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onSidebarToggle}
            className="h-9 w-9 rounded-md shrink-0"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Search Bar on the Left (over the former overview text area) */}
        <div className="relative w-full max-w-md sm:max-w-lg" ref={searchContainerRef}>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
          <Input
            type="search"
            value={searchFilter}
            onChange={(e) => {
              setSearchFilter?.(e.target.value);
              setIsSearchFocused(true);
            }}
            onFocus={() => setIsSearchFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages…"
            className="h-10 w-full rounded-lg bg-background pl-10 pr-9 text-sm shadow-none placeholder:text-muted-foreground/70 [&::-webkit-search-cancel-button]:hidden"
          />
          {searchFilter && (
            <button
              type="button"
              onClick={() => {
                setSearchFilter?.('');
                setIsSearchFocused(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-sm"
              aria-label="Clear search"
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
                  No menu found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Channel focus: centred on wide screens, its own row below on smaller ones */}
      <ChannelViewSwitcher className="hidden xl:flex" />

      <div className="flex flex-1 items-center justify-end gap-2 xl:max-w-sm">
        {hasPos && access.can('manage_pos') && (
          <a
            href={POS_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <MonitorSmartphone className="h-4 w-4" />
            <span className="hidden sm:inline">Open POS</span>
          </a>
        )}
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
