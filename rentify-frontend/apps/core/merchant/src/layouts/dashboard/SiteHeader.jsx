import { useTranslation, useMediaQuery } from '@rentify/utils';
import { HelpCircle, Bell, Menu } from 'lucide-react';
import DashboardBreadcrumb from './DashboardBreadcrumb';
import { Button } from '@rentify/shared/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@rentify/shared/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@rentify/shared/ui/dropdown-menu';
export function SiteHeader({ currentTab, onSidebarToggle, userData }) {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 900px)');

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-background text-foreground border-border px-4 md:px-6">
      <div className="flex items-center gap-4 flex-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onSidebarToggle}
          className="h-9 w-9 rounded-md"
        >
          <Menu className="h-5 w-5" />
        </Button>
        {!isMobile && <DashboardBreadcrumb currentTab={currentTab} />}
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center">
            3
          </span>
        </Button>
        <Button variant="ghost" size="icon">
          <HelpCircle className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
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