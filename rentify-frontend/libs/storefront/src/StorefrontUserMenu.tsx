import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LogIn,
  LogOut,
  User,
  LayoutDashboard,
  Package,
  ClipboardList,
  Store,
  Crown,
  Settings,
} from 'lucide-react';
import { useStorefrontAuth } from './hooks/useStorefrontAuth';
import { Button } from '@rentify/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@rentify/shared/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@rentify/shared/ui/avatar';
import { Badge } from '@rentify/shared/ui/badge';
import { AUTH_URL, DASHBOARD_URL } from '@rentify/shared/config/urls';

export function StorefrontUserMenu() {
  const {
    profile,
    isAuthenticated,
    isOwner,
    isMerchant,
    isStaff,
    logout,
  } = useStorefrontAuth();
  const navigate = useNavigate();

  const returnUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const loginUrl = `${AUTH_URL}?returnUrl=${encodeURIComponent(returnUrl)}`;

  if (!isAuthenticated) {
    return (
      <Button asChild variant="outline" size="sm" className="gap-2">
        <a href={loginUrl}>
          <LogIn className="h-4 w-4" />
          <span>Sign in</span>
        </a>
      </Button>
    );
  }

  const userInitials =
    profile?.name
      ?.split(' ')
      .map((part: string) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';

  const roleLabel = isOwner
    ? 'Store Owner'
    : isMerchant
      ? 'Merchant'
      : isStaff
        ? 'Staff'
        : 'Customer';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 rounded-full px-2 gap-2 hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Avatar className="h-7 w-7 ring-1 ring-border">
            <AvatarImage src={profile?.profileImage} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:inline-block text-sm font-medium max-w-[120px] truncate">
            {profile?.name || 'Account'}
          </span>
          {isOwner && (
            <Crown className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 p-2 shadow-lg rounded-xl">
        {/* Profile Card Header */}
        <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/60 mb-1">
          <Avatar className="h-10 w-10 ring-1 ring-background">
            <AvatarImage src={profile?.profileImage} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold truncate text-foreground">
                {profile?.name || 'User'}
              </p>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {profile?.email}
            </p>
            <div className="mt-1">
              <Badge
                variant={isOwner ? 'default' : 'secondary'}
                className="text-[10px] px-1.5 py-0 font-medium"
              >
                {isOwner && <Crown className="h-2.5 w-2.5 mr-1" />}
                {roleLabel}
              </Badge>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator className="my-1" />

        {/* Merchant & Store Owner Links */}
        {(isOwner || isMerchant) && (
          <>
            <DropdownMenuLabel className="text-[11px] text-muted-foreground font-semibold px-2 py-1">
              Merchant Management
            </DropdownMenuLabel>
            <DropdownMenuItem asChild className="cursor-pointer">
              <a
                href={`${DASHBOARD_URL}/overview`}
                className="flex items-center gap-2 px-2 py-1.5 text-sm"
              >
                <LayoutDashboard className="h-4 w-4 text-primary" />
                <span>Merchant Dashboard</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <a
                href={`${DASHBOARD_URL}/products`}
                className="flex items-center gap-2 px-2 py-1.5 text-sm"
              >
                <Package className="h-4 w-4 text-emerald-500" />
                <span>Manage Products</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <a
                href={`${DASHBOARD_URL}/orders`}
                className="flex items-center gap-2 px-2 py-1.5 text-sm"
              >
                <ClipboardList className="h-4 w-4 text-orange-500" />
                <span>Manage Orders</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <a
                href={`${DASHBOARD_URL}/store`}
                className="flex items-center gap-2 px-2 py-1.5 text-sm"
              >
                <Store className="h-4 w-4 text-purple-500" />
                <span>Store Customization</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
          </>
        )}

        {/* Account & Profile */}
        <DropdownMenuItem
          onClick={() => navigate('/profile')}
          className="cursor-pointer flex items-center gap-2 px-2 py-1.5 text-sm"
        >
          <User className="h-4 w-4 text-muted-foreground" />
          <span>My Profile & Orders</span>
        </DropdownMenuItem>

        {(isOwner || isMerchant) && (
          <DropdownMenuItem asChild className="cursor-pointer">
            <a
              href={`${DASHBOARD_URL}/settings/account`}
              className="flex items-center gap-2 px-2 py-1.5 text-sm"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span>Merchant Settings</span>
            </a>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator className="my-1" />

        {/* Sign Out */}
        <DropdownMenuItem
          onClick={() => void logout()}
          className="cursor-pointer flex items-center gap-2 px-2 py-1.5 text-sm text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
