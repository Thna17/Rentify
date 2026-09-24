// settings-layout.tsx
import React from 'react';
import { ArrowLeft, User, CreditCard, Users, Shield, Receipt, SlidersHorizontal } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';

interface SettingsLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  icon: React.ReactNode;
}

const SETTINGS_NAV_ITEMS = [
  { name: 'Account', path: '/settings/account', icon: User },
  { name: 'Payments', path: '/settings/payments', icon: CreditCard },
  { name: 'Staff & Roles', path: '/settings/staff', icon: Users },
  { name: 'Security', path: '/settings/security', icon: Shield },
  { name: 'Billing', path: '/settings/billing', icon: Receipt },
  { name: 'Preferences', path: '/settings/preferences', icon: SlidersHorizontal },
];

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  title,
  description,
  children,
  icon,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-background py-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        {/* Header with back button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/overview')}
            className="flex items-center space-x-2 text-muted-foreground hover:text-foreground mb-3 text-xs"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Dashboard</span>
          </Button>

          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
              {React.cloneElement(icon as React.ReactElement, {
                className: 'h-6 w-6',
              })}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              <p className="text-muted-foreground text-sm">{description}</p>
            </div>
          </div>

          {/* Sub-navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
            {SETTINGS_NAV_ITEMS.map((tab) => {
              const isActive = location.pathname === tab.path;
              return (
                <button
                  key={tab.path}
                  type="button"
                  onClick={() => navigate(tab.path)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 font-semibold'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
};