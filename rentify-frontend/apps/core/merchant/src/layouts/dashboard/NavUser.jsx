import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem } from "./Sidebar";
import { useMediaQuery, useTranslation } from '@rentify/utils';
import {
  CreditCard,
  User,
  LogOut,
  MoreVertical,
  Globe,
  SlidersHorizontal,
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
import { useNavigate } from 'react-router-dom';

export function NavUser({ user, onLogout }) {
  const { t, lang, setLanguage } = useTranslation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 900px)');

  if (!user) return null;

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start data-[state=open]:bg-accent/50 rounded-lg transition-all p-2 cursor-pointer"
                >
                  <Avatar className="h-9 w-9 rounded-lg">
                    <AvatarImage src={user?.avatar || user?.profileImage} alt={user?.name} />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold text-xs">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight ml-2 min-w-0">
                    <span className="truncate font-semibold">{user.name}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {user.email}
                    </span>
                  </div>
                  <MoreVertical className="ml-auto h-4 w-4 opacity-70 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 rounded-xl shadow-lg"
                side={isMobile ? 'bottom' : 'right'}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={user?.avatar || user?.profileImage} alt={user?.name} />
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                      <span className="truncate font-medium">{user.name}</span>
                      <span className="text-muted-foreground truncate text-xs">
                        {user.email}
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
                    <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{lang === 'kh' || lang === 'km' ? 'English (ប្តូរ)' : 'ភាសាខ្មែរ (Switch)'}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer h-10 text-xs sm:text-sm"
                    onClick={() => navigate('/settings/account')}
                  >
                    <User className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{t('merchant.shell.account')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer h-10 text-xs sm:text-sm"
                    onClick={() => navigate('/settings/billing')}
                  >
                    <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{t('merchant.shell.billing')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer h-10 text-xs sm:text-sm"
                    onClick={() => navigate('/settings/preferences')}
                  >
                    <SlidersHorizontal className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Preferences</span>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer h-10 text-destructive focus:text-destructive text-xs sm:text-sm"
                  onClick={onLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('merchant.shell.logOut')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
