import React from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Button } from '@rentify/shared/ui/button';
import {
  User,
  Settings,
  ShoppingBag,
  LayoutDashboard,
  LogOut,
  LogIn,
  UserPlus,
  Crown,
  Package,
  Users,
  BarChart3,
  Store,
  ClipboardList,
  TerminalSquare,
} from 'lucide-react';
import { useAuth } from '@rentify/utils/hooks/useAuth';
import { AUTH_URL, DASHBOARD_URL } from '@rentify/shared/config/urls';

/* -------------------- helpers -------------------- */

const getRoleIcon = (role?: string) => {
  switch (role) {
    case 'admin':
      return <Crown className="h-3 w-3" />;
    case 'customer':
      return <ShoppingBag className="h-3 w-3" />;
    default:
      return <User className="h-3 w-3" />;
  }
};

const getRoleBadgeVariant = (role?: string) => {
  switch (role) {
    case 'admin':
      return 'admin'
    case 'customer':
      return 'customer'
    case 'user':
      return 'merchant'
    default:
      return 'outline'
  }
}


/* -------------------- component -------------------- */

export const UserMenu = ({
  isAuthenticated = false,
  onLogout,
}: {
  isAuthenticated?: boolean;
  onLogout?: () => void;
}) => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const userInitials =
    profile?.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() ?? 'U';

  // Authentication only accepts exact, registered return origins. A host name
  // alone is ambiguous and must never be treated as a redirect destination.
  const returnUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const loginUrl = `${AUTH_URL}?returnUrl=${encodeURIComponent(returnUrl)}`;
  const registerUrl = `${AUTH_URL}/register?returnUrl=${encodeURIComponent(returnUrl)}`;
  return (
    <DropdownMenu>
      {/* ================= TRIGGER ================= */}
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="
            h-10 w-10 rounded-full
            ring-2 ring-transparent
            hover:ring-primary/20
            transition
          "
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.profileImage} />
            <AvatarFallback className="bg-card text-card-foreground text-sm font-semibold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      {/* ================= CONTENT ================= */}
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="
          w-80 rounded-xl border bg-card
          text-card-foreground
          shadow-lg p-2
        "
      >
        {isAuthenticated ? (
          <>
            {/* ===== PROFILE HEADER ===== */}
            <div className="flex items-center gap-3 rounded-lg bg-muted p-4">
              <Avatar className="h-12 w-12 ring-2 ring-background">
                <AvatarImage src={profile?.profileImage} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">
                    {profile?.name ?? 'User'}
                  </p>

                  {profile?.role && profile.role !== 'guest' && (
                    <Badge
                      variant={getRoleBadgeVariant(profile.role)}
                      className="flex items-center gap-1 text-xs"
                    >
                      {getRoleIcon(profile.role)}
                      {profile.role}
                    </Badge>
                  )}
                </div>

                <p className="truncate text-xs text-muted-foreground">
                  {profile?.email ?? 'user@email.com'}
                </p>
              </div>
            </div>

            <DropdownMenuSeparator className="my-2" />

            {/* ===== ACCOUNT ===== */}
            <DropdownMenuLabel className="px-3 py-1.5 text-xs text-muted-foreground">
              Account
            </DropdownMenuLabel>

            <MenuItem icon={User} onClick={() => navigate('/profile')}>
              Profile
            </MenuItem>

            <MenuItem
              icon={Settings}
              onClick={() => {
                window.location.href = `${DASHBOARD_URL}/settings/account`;
              }}
            >
              Settings
            </MenuItem>

            {/* ===== USER ROLE ===== */}
            {profile?.role === 'user' && (
              <RoleSection label="Merchant Dashboard">
                <MenuItem
                  icon={LayoutDashboard}
                  onClick={() =>
                    (window.location.href = `${DASHBOARD_URL}/overview`)
                  }
                >
                  Dashboard
                </MenuItem>
                <MenuItem
                  icon={Package}
                  onClick={() =>
                    (window.location.href = `${DASHBOARD_URL}/products`)
                  }
                >
                  Products
                </MenuItem>
                <MenuItem
                  icon={ClipboardList}
                  onClick={() =>
                    (window.location.href = `${DASHBOARD_URL}/orders`)
                  }
                >
                  Orders
                </MenuItem>
                <MenuItem
                  icon={Store}
                  onClick={() =>
                    (window.location.href = `${DASHBOARD_URL}/websites`)
                  }
                >
                  Store Management
                </MenuItem>
                <MenuItem
                  icon={TerminalSquare}
                  onClick={() =>
                    (window.location.href = `${DASHBOARD_URL}/pos`)
                  }
                >
                  POS Interface
                </MenuItem>
              </RoleSection>
            )}

            {profile?.role === 'customer' && (
              <RoleSection label="Shopping">
                <MenuItem
                  icon={ShoppingBag}
                  onClick={() => navigate('/orders')}
                >
                  My Orders
                </MenuItem>
                <MenuItem icon={Package} onClick={() => navigate('/wishlist')}>
                  Wishlist
                </MenuItem>
              </RoleSection>
            )}

            {profile?.role === 'admin' && (
              <RoleSection label="Administration">
                <MenuItem
                  icon={LayoutDashboard}
                  onClick={() =>
                    (window.location.href = `${DASHBOARD_URL}/overview`)
                  }
                >
                  Dashboard
                </MenuItem>
                <MenuItem
                  icon={Users}
                  onClick={() =>
                    (window.location.href = `${DASHBOARD_URL}/users`)
                  }
                >
                  Manage Users
                </MenuItem>
                <MenuItem
                  icon={BarChart3}
                  onClick={() =>
                    (window.location.href = `${DASHBOARD_URL}/analytics`)
                  }
                >
                  Analytics
                </MenuItem>
              </RoleSection>
            )}

            <DropdownMenuSeparator className="my-2" />

            {/* ===== LOGOUT ===== */}
            <DropdownMenuItem
              onClick={onLogout}
              className="
                flex items-center gap-3 rounded-md px-3 py-2.5
                text-error hover:bg-accent transition
              "
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Sign out</span>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            {/* ===== GUEST ===== */}
            <div className="flex items-center gap-3 rounded-lg bg-muted p-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-muted text-muted-foreground">
                  <User className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>

              <div>
                <p className="text-sm font-semibold">Welcome, Guest</p>
                <p className="text-xs text-muted-foreground">
                  Sign in to access your account
                </p>
              </div>
            </div>

            <DropdownMenuSeparator className="my-2" />

            <DropdownMenuLabel className="px-3 py-1.5 text-xs text-muted-foreground">
              Get Started
            </DropdownMenuLabel>

            <MenuLink href={loginUrl} icon={LogIn}>
              Sign In
            </MenuLink>

            <MenuLink href={registerUrl} icon={UserPlus}>
              Create Account
            </MenuLink>

            <DropdownMenuSeparator className="my-2" />

            <DropdownMenuLabel className="px-3 py-1.5 text-xs text-muted-foreground">
              Browse
            </DropdownMenuLabel>

            <MenuLink href="/orders" icon={ShoppingBag}>
              Track Order
            </MenuLink>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/* -------------------- shared menu components -------------------- */

const MenuItem = ({
  icon: Icon,
  children,
  onClick,
}: {
  icon: any;
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <DropdownMenuItem
    onClick={onClick}
    className="
      flex items-center gap-3
      rounded-md px-3 py-2.5
      hover:bg-accent transition
      cursor-pointer
    "
  >
    <Icon className="h-4 w-4 text-muted-foreground" />
    <span className="text-sm">{children}</span>
  </DropdownMenuItem>
);

const MenuLink = ({
  icon: Icon,
  href,
  children,
}: {
  icon: any;
  href: string;
  children: React.ReactNode;
}) => (
  <DropdownMenuItem asChild>
    <a
      href={href}
      className="
        flex items-center gap-3
        rounded-md px-3 py-2.5
        hover:bg-accent transition
      "
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm">{children}</span>
    </a>
  </DropdownMenuItem>
);

const RoleSection = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <>
    <DropdownMenuSeparator className="my-2" />
    <DropdownMenuLabel className="px-3 py-1.5 text-xs text-muted-foreground">
      {label}
    </DropdownMenuLabel>
    {children}
  </>
);

export default UserMenu;
