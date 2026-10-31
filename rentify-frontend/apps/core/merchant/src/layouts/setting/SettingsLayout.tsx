import React from 'react';
import {
  ArrowLeft,
  ChevronRight,
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
  { name: 'Account', description: 'Profile and business details', path: '/settings/account', icon: User },
  { name: 'Payments', description: 'Payout and payment methods', path: '/settings/payments', icon: CreditCard },
  { name: 'Delivery', description: 'Delivery fee buyers pay', path: '/settings/delivery', icon: Truck },
  { name: 'Staff & Roles', description: 'Team access and permissions', path: '/settings/staff', icon: Users },
  { name: 'Security', description: 'Password and active sessions', path: '/settings/security', icon: Shield },
  { name: 'Billing', description: 'Plan, usage and invoices', path: '/settings/billing', icon: Receipt },
  { name: 'Preferences', description: 'Language and notifications', path: '/settings/preferences', icon: SlidersHorizontal },
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

        <div className="settings-page__mobile-nav" aria-label="Settings sections">
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
        </div>

        <div className="settings-page__layout">
          <aside className="settings-page__sidebar">
            <div className="settings-page__sidebar-heading">
              <span>Settings</span>
              <small>Manage your workspace</small>
            </div>
            <nav aria-label="Settings sections">
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
                    <span className="settings-page__nav-icon"><item.icon aria-hidden="true" /></span>
                    <span className="settings-page__nav-copy">
                      <strong>{item.name}</strong>
                      <small>{item.description}</small>
                    </span>
                    <ChevronRight className="settings-page__nav-arrow" aria-hidden="true" />
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="settings-page__content" aria-label={`${title} content`}>
            {children}
          </section>
        </div>
      </div>
    </main>
  );
};
