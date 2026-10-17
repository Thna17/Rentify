import React from 'react';
import {
  BarChart3,
  Check,
  FileText,
  LayoutDashboard,
  Minus,
  Package,
  ShoppingBag,
  Sparkles,
  Store,
  Wallet,
} from 'lucide-react';
import { cn } from '@rentify/utils';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Reveal, Stagger, StaggerItem } from '../../../components/site/motion';
import { ButtonLink } from '../../../components/site/ui';
import {
  CORE_FEATURES,
  formatPeriod,
  formatPrice,
  formatRiel,
  planCommission,
  planFeatureChecklist,
  planTierKey,
  planWhoItsFor,
  translateFeature,
} from '../../../utils/planFormat';

const CORE_ICONS = {
  'basic-dashboard': LayoutDashboard,
  'product-management': Package,
  'order-management': ShoppingBag,
  store: Store,
  'advanced-analytics': BarChart3,
  invoice: FileText,
  pos: Wallet,
};

const PlanCard = ({ plan, index, count, recommended }) => {
  const { t } = useLanguage();
  const tierKey = planTierKey(plan, index, count);
  const free = Number(plan.price) === 0;
  const checklist = planFeatureChecklist(plan);
  const whoItsFor = planWhoItsFor(plan);
  const commission = planCommission(plan);
  const ctaLink = free ? '/start' : `/start?plan=${tierKey}`;

  return (
    <div
      className={cn(
        'relative flex h-full flex-col rounded-[28px] bg-white p-8 transition-shadow duration-500 md:p-10',
        recommended
          ? 'shadow-[0_30px_80px_-40px_rgba(0,113,227,0.55)] ring-2 ring-[#0071e3]'
          : 'ring-1 ring-black/[0.06] hover:shadow-[0_30px_80px_-50px_rgba(0,0,0,0.35)]'
      )}
    >
      <div className="flex min-h-[28px] items-center justify-between gap-2">
        {recommended ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0071e3]/10 px-3 py-1 text-[12px] font-semibold text-[#0071e3]">
            <Sparkles className="h-3.5 w-3.5" />
            {t('site.pricing.recommended')} • 14-day free trial
          </span>
        ) : free ? (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700">
            Free Forever
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[12px] font-semibold text-slate-700">
            14-day free trial
          </span>
        )}
      </div>

      <h3 className="mt-3 text-[28px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
        {plan.name}
      </h3>
      <p className="mt-1.5 text-[14px] font-medium text-[#0071e3]">
        Who it’s for: <span className="font-normal text-[#424245]">{whoItsFor}</span>
      </p>

      <div className="mt-7 flex items-baseline gap-1.5">
        <span className="text-[52px] font-semibold leading-none tracking-[-0.04em] text-[#1d1d1f]">
          {free ? '$0' : `≈${formatPrice(plan.price)}`}
        </span>
        <span className="text-[17px] text-[#6e6e73]">{formatPeriod(plan, t)}</span>
      </div>
      <p className="mt-2 h-5 text-[13px] text-[#86868b]">
        {free
          ? 'No monthly fee • Start selling today'
          : `${t('site.pricing.approx')} ${formatRiel(plan.price)}/mo after 14-day free trial`}
      </p>

      <ButtonLink
        to={ctaLink}
        variant={recommended ? 'primary' : 'dark'}
        size="lg"
        className="mt-7 w-full"
      >
        {free ? 'Start Free' : `Start 14-Day Free Trial`}
      </ButtonLink>

      <ul className="mt-8 flex-1 space-y-3.5 border-t border-black/10 pt-7">
        {checklist.map(({ label, included }) => (
          <li
            key={label}
            className={cn(
              'flex items-start gap-3 text-[15px] leading-snug',
              included ? 'text-[#1d1d1f] font-medium' : 'text-[#86868b]'
            )}
          >
            {included ? (
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
            ) : (
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Minus className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
            )}
            <span>{label}</span>
          </li>
        ))}
      </ul>

      <div className="mt-7 rounded-2xl bg-[#f5f5f7] px-4 py-3.5 text-[13px]">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-[#1d1d1f]">Commission</span>
          <span className="font-medium text-[#424245]">{commission}</span>
        </div>
      </div>
    </div>
  );
};

const PlanSkeleton = () => (
  <div className="h-[640px] animate-pulse rounded-[28px] bg-white ring-1 ring-black/[0.06]" />
);

const PlanCards = ({ plans, isLoading }) => {
  const { t } = useLanguage();
  const recommendedIndex = plans.length > 2 ? 1 : plans.length - 1;
  const everyPlan = CORE_FEATURES.filter((feature) =>
    plans.every((plan) => (plan.features || []).includes(feature))
  );

  if (isLoading) {
    return (
      <div className="grid gap-5 lg:grid-cols-3" aria-label={t('site.pricing.loading')}>
        {[0, 1, 2].map((i) => (
          <PlanSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!plans.length) {
    return (
      <p className="rounded-[28px] bg-white p-10 text-center text-[17px] text-[#6e6e73]">
        {t('site.pricing.error')}
      </p>
    );
  }

  return (
    <>
      <Stagger
        className={cn(
          'grid gap-6',
          plans.length >= 3 ? 'lg:grid-cols-3' : 'mx-auto max-w-3xl md:grid-cols-2'
        )}
        stagger={0.12}
      >
        {plans.map((plan, index) => (
          <StaggerItem key={plan.id}>
            <PlanCard
              plan={plan}
              index={index}
              count={plans.length}
              recommended={index === recommendedIndex && plans.length > 1}
            />
          </StaggerItem>
        ))}
      </Stagger>

      {everyPlan.length > 0 && (
        <Reveal className="mt-16 text-center md:mt-20">
          <p className="text-[15px] font-semibold text-[#1d1d1f]">{t('site.pricing.everyPlan')}</p>
          <ul className="mt-6 flex flex-wrap justify-center gap-x-10 gap-y-5">
            {everyPlan.map((feature) => {
              const Icon = CORE_ICONS[feature] || Check;
              return (
                <li key={feature} className="flex items-center gap-2 text-[15px] text-[#424245]">
                  <Icon className="h-[18px] w-[18px] text-[#1d1d1f]" strokeWidth={1.5} />
                  {translateFeature(feature, t)}
                </li>
              );
            })}
          </ul>
        </Reveal>
      )}
    </>
  );
};

export default PlanCards;

