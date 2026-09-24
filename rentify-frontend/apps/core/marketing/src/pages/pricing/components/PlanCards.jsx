import React from 'react';
import {
  BarChart3,
  Check,
  FileText,
  HardDrive,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Store,
  Users,
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
  formatStorage,
  planHighlights,
  planLimit,
  planTier,
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
  const tier = planTier(index, count);
  const free = Number(plan.price) === 0;
  const highlights = planHighlights(plan, t);
  const limits = [
    { icon: Package, label: t('site.pricing.limits.products'), value: planLimit(plan, 'products', t) },
    { icon: Users, label: t('site.pricing.limits.staff'), value: planLimit(plan, 'staff', t) },
    { icon: HardDrive, label: t('site.pricing.limits.storage'), value: formatStorage(plan.limits?.storage) },
  ];

  return (
    <div
      className={cn(
        'relative flex h-full flex-col rounded-[28px] bg-white p-8 transition-shadow duration-500 md:p-10',
        recommended
          ? 'shadow-[0_30px_80px_-40px_rgba(0,113,227,0.55)] ring-2 ring-[#0071e3]'
          : 'ring-1 ring-black/[0.06] hover:shadow-[0_30px_80px_-50px_rgba(0,0,0,0.35)]'
      )}
    >
      <div className="h-6">
        {recommended && (
          <p className="text-[13px] font-semibold text-[#0071e3]">
            {t('site.pricing.recommended')}
          </p>
        )}
      </div>
      <h3 className="mt-1 text-[28px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
        {plan.name}
      </h3>
      <p className="mt-2 min-h-[44px] text-[15px] leading-snug text-[#6e6e73]">
        {t(`site.pricing.tiers.${tier}`)}
      </p>

      <div className="mt-8 flex items-baseline gap-1.5">
        <span className="text-[56px] font-semibold leading-none tracking-[-0.04em] text-[#1d1d1f]">
          {formatPrice(plan.price)}
        </span>
        <span className="text-[17px] text-[#6e6e73]">{formatPeriod(plan, t)}</span>
      </div>
      <p className="mt-2 h-5 text-[13px] text-[#86868b]">
        {free ? '' : `${t('site.pricing.approx')} ${formatRiel(plan.price)}`}
      </p>

      <ButtonLink
        to={`/onboarding/${plan.id}`}
        variant={recommended ? 'primary' : 'dark'}
        size="lg"
        className="mt-8 w-full"
      >
        {free ? t('site.common.startTrial') : `${t('site.pricing.choose')} ${plan.name}`}
      </ButtonLink>

      <dl className="mt-8 space-y-3 border-t border-black/10 pt-8">
        {limits.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center justify-between text-[15px]">
            <dt className="flex items-center gap-2.5 text-[#6e6e73]">
              <Icon className="h-4 w-4" strokeWidth={1.6} />
              {label}
            </dt>
            <dd className="font-medium text-[#1d1d1f]">{value}</dd>
          </div>
        ))}
      </dl>

      {highlights.length > 0 && (
        <ul className="mt-8 space-y-3 border-t border-black/10 pt-8">
          {highlights.map((highlight) => (
            <li key={highlight} className="flex items-start gap-2.5 text-[15px] text-[#1d1d1f]">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0071e3]" strokeWidth={2.2} />
              {highlight}
            </li>
          ))}
        </ul>
      )}
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
          'grid gap-5',
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
