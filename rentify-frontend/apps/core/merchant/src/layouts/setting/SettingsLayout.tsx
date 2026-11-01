import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { CreditCard, Receipt, Shield, SlidersHorizontal, Truck, User, Users, type LucideIcon } from 'lucide-react';
import { useTranslation } from '@rentify/utils';
import { PageTitle } from '../../components/page/PagePrimitives';

export interface SettingsSection {
  key: string;
  path: string;
  icon: LucideIcon;
}

/** Every settings section, in the order of the Settings list (redesign M21). */
export const SETTINGS_SECTIONS: SettingsSection[] = [
  { key: 'account', path: '/settings/account', icon: User },
  { key: 'payments', path: '/settings/payments', icon: CreditCard },
  { key: 'delivery', path: '/settings/delivery', icon: Truck },
  { key: 'staff', path: '/settings/staff', icon: Users },
  { key: 'billing', path: '/settings/billing', icon: Receipt },
  { key: 'preferences', path: '/settings/preferences', icon: SlidersHorizontal },
  { key: 'security', path: '/settings/security', icon: Shield },
];

interface SettingsLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
  /** Kept for callers that still pass one; settings pages don't show page icons. */
  icon?: ReactNode;
  /** The section's main action, beside the title (e.g. Invite on Staff & roles). */
  actions?: ReactNode;
}

/**
 * The one settings shell (audit P11): the dashboard's own page frame, a back link to the
 * Settings list on phones, and the section list beside the page from tablet width up.
 */
export function SettingsLayout({ title, description, children, actions }: SettingsLayoutProps) {
  const { t } = useTranslation();
  return (
    <div className="min-h-full">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 md:grid-cols-[220px_1fr] md:px-8 md:py-8">
        <nav aria-label={t('merchant.settings.title')} className="hidden md:block">
          <p className="mb-2 px-3 text-sm font-semibold text-foreground">{t('merchant.settings.title')}</p>
          <ul className="space-y-0.5">
            {SETTINGS_SECTIONS.map(({ key, path, icon: Icon }) => (
              <li key={key}>
                <NavLink
                  to={path}
                  className={({ isActive }) =>
                    `flex min-h-[44px] items-center gap-2.5 rounded-xl px-3 text-sm font-medium transition-colors ${
                      isActive ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {t(`merchant.settings.sections.${key}.title`)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 space-y-5">
          <PageTitle back={{ to: '/settings', label: t('merchant.settings.title'), phoneOnly: true }} title={title} description={description} actions={actions} />
          <section aria-label={title} className="space-y-6">
            {children}
          </section>
        </div>
      </div>
    </div>
  );
}

export default SettingsLayout;
