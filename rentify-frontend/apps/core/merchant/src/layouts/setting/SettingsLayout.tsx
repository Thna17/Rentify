import React from 'react';
import {
  CreditCard,
  Receipt,
  Shield,
  SlidersHorizontal,
  Truck,
  User,
  Users,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface SettingsLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const SETTINGS_NAV_ITEMS = [
  { name: 'Account', path: '/settings/account', icon: User },
  { name: 'Payments', path: '/settings/payments', icon: CreditCard },
  { name: 'Delivery', path: '/settings/delivery', icon: Truck },
  { name: 'Staff & Roles', path: '/settings/staff', icon: Users },
  { name: 'Security', path: '/settings/security', icon: Shield },
  { name: 'Billing', path: '/settings/billing', icon: Receipt },
  { name: 'Preferences', path: '/settings/preferences', icon: SlidersHorizontal },
];

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({ title, description, children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground hidden sm:block max-w-2xl">{description}</p>
          )}
        </div>

        {/* Settings subnavigation tabs */}
        <nav
          className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border [scrollbar-width:none]"
          aria-label="Settings sections"
        >
          {SETTINGS_NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <section aria-label={`${title} content`} className="space-y-6">
          {children}
        </section>
      </div>
    </div>
  );
};
