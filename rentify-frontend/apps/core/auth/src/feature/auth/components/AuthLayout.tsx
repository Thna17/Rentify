import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthLanguage } from '../context/AuthLanguageContext';
import { useAuthConfig } from '../utils/authUtils';
import { useWebsiteData } from '@rentify/shared/context/WebsiteContext';
import {
  Store,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  QrCode,
  Layers,
  ArrowLeft,
  CheckCircle2,
  Globe,
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
  const { language, setLanguage, t, isKhmer } = useAuthLanguage();
  const {
    redirectUrl,
    isWebsiteTemplate,
    isMarketplace,
    isHostedStorefrontBuyer,
  } = useAuthConfig();
  const { content } = useWebsiteData();
  const storeName =
    content?.['Site Title'] || content?.['Website Name'] || content?.name;

  const isCustomerFlow = isWebsiteTemplate || isHostedStorefrontBuyer;

  // Resolve back link destination
  const computedBackUrl = backUrl || redirectUrl || '/';
  const computedBackLabel =
    backLabel ||
    (isCustomerFlow
      ? t('nav.backToStore')
      : isMarketplace
        ? t('nav.backToMarket')
        : t('nav.backToHome'));

  return (
    <div className="min-h-screen w-full bg-slate-950 font-sans selection:bg-emerald-500 selection:text-white">
      <div className="grid min-h-screen lg:grid-cols-[1fr_1.2fr] xl:grid-cols-[1fr_1.35fr]">
        {/* Left: Hero Brand Panel (Desktop) */}
        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14 border-r border-white/10">
          {/* Subtle Ambient Background Lighting */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="pointer-events-none absolute top-1/2 left-1/3 h-64 w-64 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-2xl" />

          {/* Top Brand Header */}
          <div className="relative z-10 flex items-center justify-between">
            <Link to="/" className="group flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/25 ring-1 ring-white/20 transition-transform group-hover:scale-105">
                <Store className="h-6 w-6 text-slate-950" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-white">
                  Rentify
                </span>
                <span className="text-xs text-slate-400">
                  Cambodia & Global Commerce
                </span>
              </div>
            </Link>

            {/* Context Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 backdrop-blur-md">
              {isCustomerFlow ? (
                <>
                  <ShoppingBag className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{storeName || 'Store Customer Portal'}</span>
                </>
              ) : isMarketplace ? (
                <>
                  <Store className="h-3.5 w-3.5 text-blue-400" />
                  <span>Rentify Marketplace</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>Merchant & Admin Suite</span>
                </>
              )}
            </div>
          </div>

          {/* Center Brand Value Proposition */}
          <div className="relative z-10 my-auto py-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-400 ring-1 ring-emerald-500/20 mb-6">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{t('hero.badge')}</span>
            </div>

            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white xl:text-4xl">
              {isCustomerFlow
                ? t('hero.title.customer')
                : isMarketplace
                  ? t('hero.title.marketplace')
                  : t('hero.title.merchant')}
            </h1>

            <p className="mt-4 text-base text-slate-300 xl:text-lg leading-relaxed max-w-lg">
              {isCustomerFlow
                ? t('hero.subtitle.customer')
                : isMarketplace
                  ? t('hero.subtitle.marketplace')
                  : t('hero.subtitle.merchant')}
            </p>

            {/* Feature Highlights Grid */}
            <div className="mt-10 space-y-4 max-w-lg">
              <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm transition-all hover:bg-white/[0.06]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    {t('hero.feature.khqr')}
                  </h4>
                  <p className="mt-0.5 text-xs text-slate-400 leading-normal">
                    {t('hero.feature.khqrDesc')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm transition-all hover:bg-white/[0.06]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    {t('hero.feature.security')}
                  </h4>
                  <p className="mt-0.5 text-xs text-slate-400 leading-normal">
                    {t('hero.feature.securityDesc')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm transition-all hover:bg-white/[0.06]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/30">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    {t('hero.feature.channels')}
                  </h4>
                  <p className="mt-0.5 text-xs text-slate-400 leading-normal">
                    {t('hero.feature.channelsDesc')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Trust & Compliance Footnote */}
          <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
            <span>{t('footer.copyright')}</span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>PCI DSS & Bakong Ready</span>
            </span>
          </div>
        </aside>

        {/* Right: Modern Form Panel */}
        <main className="flex flex-col justify-between bg-slate-50 sm:bg-slate-100/70 p-4 sm:p-8 lg:p-10 xl:p-14 relative overflow-y-auto">
          {/* Top Controls Bar: Return navigation + Language Switcher */}
          <header className="flex items-center justify-between w-full max-w-xl mx-auto mb-6 sm:mb-8">
            <a
              href={computedBackUrl}
              className="group inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm group-hover:border-slate-300 group-hover:bg-slate-50 transition-all">
                <ArrowLeft className="h-4 w-4" />
              </div>
              <span className={cn('truncate max-w-[180px] sm:max-w-xs', isKhmer && 'font-khmer')}>
                {computedBackLabel}
              </span>
            </a>

            {/* Language Selector Pill */}
            <div className="flex items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setLanguage('EN')}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all',
                  language === 'EN'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                )}
                aria-label="Switch to English"
              >
                <span>🇬🇧</span>
                <span>EN</span>
              </button>
              <button
                type="button"
                onClick={() => setLanguage('KH')}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold font-khmer transition-all',
                  language === 'KH'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                )}
                aria-label="Switch to Khmer"
              >
                <span>🇰🇭</span>
                <span>ខ្មែរ</span>
              </button>
            </div>
          </header>

          {/* Form Content Wrapper */}
          <div className="w-full max-w-xl mx-auto my-auto py-4">
            {/* Mobile Header Branding (Visible only on small screens) */}
            <div className="lg:hidden mb-6 text-center">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-md shadow-emerald-500/20 mb-3">
                <Store className="h-6 w-6 text-slate-950" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Rentify</h2>
              <p className={cn('text-xs text-slate-500 mt-0.5', isKhmer && 'font-khmer')}>
                {isCustomerFlow ? (storeName || 'Storefront') : 'Cambodia & Global Commerce'}
              </p>
            </div>

            {/* Card Content Slot */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-xl shadow-slate-200/50 backdrop-blur-xl">
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
                        'mt-2 text-sm text-slate-500 leading-relaxed',
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

          {/* Mobile Footer */}
          <footer className="w-full max-w-xl mx-auto mt-6 pt-4 border-t border-slate-200 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className={cn(isKhmer && 'font-khmer')}>{t('footer.copyright')}</span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span className={cn(isKhmer && 'font-khmer')}>{t('footer.security')}</span>
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default AuthLayout;
