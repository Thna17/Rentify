import React from 'react';
import {
  ArrowLeft,
  CreditCard,
  Receipt,
  Shield,
  SlidersHorizontal,
  Truck,
  User,
  Users,
} from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { useLocation, useNavigate } from 'react-router-dom';

interface SettingsLayoutProps {
  title: string;
  description: string;
  children: React.ReactNode;
  icon: React.ReactNode;
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

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({ title, description, children, icon }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <main className="settings-page ds-page min-h-screen">
      <div className="settings-page__container">
        <Button variant="ghost" onClick={() => navigate('/overview')} className="settings-page__back">
          <ArrowLeft aria-hidden="true" />
          <span>Back to dashboard</span>
        </Button>

        <header className="settings-page__hero">
          <div className="settings-page__hero-icon" aria-hidden="true">
            {React.cloneElement(icon as React.ReactElement, { className: 'h-6 w-6' })}
          </div>
          <div className="min-w-0">
            <p className="settings-page__eyebrow">Workspace settings</p>
            <h1>{title}</h1>
            <p className="settings-page__description">{description}</p>
          </div>
        </header>

        <nav className="settings-page__nav" aria-label="Settings sections">
          {SETTINGS_NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                aria-current={isActive ? 'page' : undefined}
                className={isActive ? 'is-active' : undefined}
              >
                <item.icon aria-hidden="true" />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <section className="settings-page__content" aria-label={`${title} content`}>
          {children}
        </section>
      </div>
    </main>
  );
};
