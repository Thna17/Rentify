import { useMediaQuery } from '@rentify/utils';
import { HelpCircle, Bell, Menu, Search, X } from 'lucide-react';
import DashboardBreadcrumb from './DashboardBreadcrumb';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@rentify/shared/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@rentify/shared/ui/dropdown-menu';
import React, { useState, useRef, useEffect } from 'react';

export function SiteHeader({
  currentTab,
  onSidebarToggle,
  userData,
  isSidebarOpen = true,
  tabs = [],
  onTabChange,
  searchFilter = '',
  setSearchFilter,
}) {
  const isMobile = useMediaQuery('(max-width: 900px)');
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
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background text-foreground border-border px-4 md:px-6">
      <div className="flex items-center gap-4 min-w-0">
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
        {!isMobile && <DashboardBreadcrumb currentTab={currentTab} />}
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        {/* Search Bar */}
        <div className="relative w-44 sm:w-56 md:w-64" ref={searchContainerRef}>
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70 pointer-events-none" />
          <Input
            type="search"
            value={searchFilter}
            onChange={(e) => {
              setSearchFilter?.(e.target.value);
              setIsSearchFocused(true);
            }}
            onFocus={() => setIsSearchFocused(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search menu..."
            className="w-full bg-muted/40 pl-8 pr-7 h-8.5 rounded-md border-border text-xs focus-visible:bg-background"
          />
          {searchFilter && (
            <button
              type="button"
              onClick={() => {
                setSearchFilter?.('');
                setIsSearchFocused(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-sm"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Quick Menu Results Dropdown */}
          {isSearchFocused && searchFilter.trim() && (
            <div className="absolute right-0 top-full mt-1.5 w-64 sm:w-72 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg overflow-hidden z-50 py-1 max-h-80 overflow-y-auto">
              {filteredTabs.length > 0 ? (
                filteredTabs.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      type="button"
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
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
                          <span className="text-[10px] text-muted-foreground ml-2 capitalize">
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

        <Button variant="ghost" size="icon" className="relative shrink-0">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center">
            3
          </span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => onTabChange?.('help')}
          title="Help & Support"
        >
          <HelpCircle className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full shrink-0">
              <Avatar className="h-9 w-9">
                <AvatarImage src={userData?.avatar} alt={userData?.name || 'User'} />
                <AvatarFallback>
                  {userData?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export default SiteHeader;