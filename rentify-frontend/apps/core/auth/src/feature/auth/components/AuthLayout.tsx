import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthLanguage } from '../context/AuthLanguageContext';
import { LanguageToggle } from './LanguageToggle';
import { useAuthConfig } from '../utils/authUtils';
import {
  Store,
  ShoppingBag,
  ShieldCheck,
  ArrowLeft,
  PackageCheck,
  UsersRound,
} from 'lucide-react';
import { cn } from '@rentify/utils';

export interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  backUrl?: string;
  backLabel?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  badge,
  backUrl,
  backLabel,
}) => {
  const { t, isKhmer } = useAuthLanguage();
  const {
    isWebsiteTemplate,
    isHostedStorefrontBuyer,
  } = useAuthConfig();

  const location = useLocation();
  const isCustomerFlow = isWebsiteTemplate || isHostedStorefrontBuyer;

  const computedBackUrl = backUrl || `/login${location.search}`;
  const computedBackLabel = backLabel || t('nav.backToLogin');

  return (
    <div lang={isKhmer ? 'km' : 'en'} className={cn('flex min-h-screen items-center justify-center bg-[#f7f8fb] px-4 py-8 sm:px-6', isKhmer ? 'font-khmer' : 'font-sans')}>
      <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-xl shadow-slate-200/60 lg:min-h-[680px] lg:grid-cols-[0.9fr_1.1fr]">
        <aside
          className={cn(
            'relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between',
            isWebsiteTemplate
              ? 'bg-gradient-to-br from-sky-50 via-blue-50/60 to-white'
              : 'bg-gradient-to-br from-violet-50 via-indigo-50/60 to-white'
          )}
        >
          <div className="relative">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-2xl',
                isWebsiteTemplate ? 'bg-blue-100 text-blue-600' : 'bg-violet-100 text-violet-600'
              )}
            >
              {isWebsiteTemplate ? (
                <ShoppingBag className="h-6 w-6" />
              ) : (
                <Store className="h-6 w-6" />
              )}
            </div>
            <p
              className={cn(
                'mt-10 text-sm font-semibold uppercase tracking-[0.2em]',
                isWebsiteTemplate ? 'text-blue-600/70' : 'text-violet-600/70'
              )}
            >
              Rentify
            </p>
            <h1 className="mt-4 max-w-sm text-4xl font-bold leading-tight tracking-tight text-slate-900">
              {t('workspace.title')}
            </h1>
            <p className="mt-5 max-w-sm text-base leading-7 text-slate-500">
              {t('workspace.subtitle')}
            </p>
          </div>
          <div className="relative space-y-4 text-sm text-slate-600">
            <div className="flex items-center gap-3">
              <PackageCheck className="h-5 w-5 text-slate-400" /> {t('workspace.sync')}
            </div>
            <div className="flex items-center gap-3">
              <UsersRound className="h-5 w-5 text-slate-400" /> {t('workspace.customers')}
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-slate-400" /> {t('workspace.security')}
            </div>
          </div>
        </aside>


        {/* Right: Modern Form Panel */}
        <main className="flex flex-col px-6 py-8 sm:px-12 sm:py-10 lg:px-16 lg:py-12">
          {/* Top Controls Bar: Return navigation + Language Switcher */}
          <header className="flex items-center justify-between w-full max-w-[460px] mx-auto mb-6 sm:mb-8">
            <Link
              to={computedBackUrl}
              className="group inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm group-hover:border-slate-300 group-hover:bg-slate-50 transition-all">
                <ArrowLeft className="h-4 w-4" />
              </div>
              <span className={cn('truncate max-w-[180px] sm:max-w-xs', isKhmer && 'font-khmer')}>
                {computedBackLabel}
              </span>
            </Link>

            <LanguageToggle />
          </header>

          {/* Form Content Wrapper */}
          <div className="w-full max-w-[460px] mx-auto my-auto py-4">
            {/* Mobile Header Branding (Visible only on small screens) */}
            <div className="lg:hidden mb-6 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 mb-3">
                <Store className="h-6 w-6 text-violet-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">{t('brand.name')}</h2>
              <p className={cn('text-xs text-slate-500 mt-0.5', isKhmer && 'font-khmer')}>
                {isCustomerFlow ? t('brand.storefront') : t('brand.workspace')}
              </p>
            </div>

            {/* Card Content Slot */}
            <div className="w-full">
              {(badge || title || subtitle) && (
                <div className="mb-6">
                  {badge && <div className="mb-3">{badge}</div>}
                  {title && (
                    <h2
                      className={cn(
                        'text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl',
                        isKhmer && 'font-khmer'
                      )}
                    >
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p
                      className={cn(
                        'mt-3 text-base text-slate-500 leading-7',
                        isKhmer && 'font-khmer'
                      )}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>
              )}
              {children}
            </div>
          </div>

        </main>
      </div>
    </div>
  );
};

export default AuthLayout;
