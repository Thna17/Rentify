import { useMediaQuery } from '@rentify/utils';
import { Search, X } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { Sheet, SheetContent } from '@rentify/shared/ui/sheet';
import { Input } from '@rentify/shared/ui/input';
import { ADDITIONAL_NAV_ITEMS } from '../../config/dashboard-tabs';
import { NavDocuments } from './NavDocuments';
import { NavMain } from './NavMain';
import { NavUser } from './NavUser';

export function AppSidebar({
  tabs,
  currentTab,
  onTabChange,
  userData,
  onLogout,
  isOpen,
  setOpen,
}) {
  const isMobile = useMediaQuery('(max-width: 900px)');

  const sidebarContent = (
    <div className="flex h-full flex-col bg-gradient-to-b from-background to-background/95 text-foreground w-72 border-r border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 shadow-md">
              <span className="text-lg font-bold text-primary-foreground">
                R
              </span>
            </div>
            <div>
              <span className="text-lg font-semibold">Rentify</span>
              <div className="text-xs text-muted-foreground">Dashboard</div>
            </div>
          </div>
          {!isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="h-8 w-8 rounded-lg opacity-70 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-full bg-background pl-8 rounded-lg"
          />
        </div>
      </div>

      {/* Navigation Content */}
      <div className="flex-1 overflow-auto py-4">
        <NavMain
          items={tabs}
          currentTab={currentTab}
          onTabChange={onTabChange}
        />
        <NavDocuments
          items={ADDITIONAL_NAV_ITEMS.documents}
          currentTab={currentTab}
          onTabChange={onTabChange}
        />
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-gray-200 bg-background/50">
        <NavUser user={userData} onLogout={onLogout} />
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-72">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  return isOpen ? sidebarContent : null;
}

export default AppSidebar;
