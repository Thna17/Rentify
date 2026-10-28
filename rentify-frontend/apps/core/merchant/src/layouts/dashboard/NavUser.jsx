import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem } from "./Sidebar";
import { useMediaQuery, useTranslation } from '@rentify/utils';
import {
  CreditCard,
  User,
  LogOut,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@rentify/shared/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@rentify/shared/ui/dropdown-menu';

export function NavUser({ user, onLogout }) {
  const isMobile = useMediaQuery('(max-width: 900px)');
  const { t } = useTranslation();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start data-[state=open]:bg-accent/50 rounded-lg transition-all p-2"
                >
                  <Avatar className="h-9 w-9 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg bg-primary/10">
                      {user.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight ml-2">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {user.email}
                    </span>
                  </div>
                  <MoreVertical className="ml-auto h-4 w-4 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 rounded-xl shadow-lg"
                side={isMobile ? 'bottom' : 'right'}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="rounded-lg">
                        {user.name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{user.name}</span>
                      <span className="text-muted-foreground truncate text-xs">
                        {user.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild className="cursor-pointer h-10">
                    <a href="/settings/account">
                    <User className="mr-2 h-4 w-4" />
                    <span>{t('dashboard.shell.account')}</span>
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer h-10">
                    <a href="/settings/billing">
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>{t('dashboard.shell.billing')}</span>
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer h-10 text-destructive focus:text-destructive"
                  onClick={onLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('dashboard.shell.log_out')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
