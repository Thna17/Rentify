import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, Info } from 'lucide-react';
import { cn } from '@rentify/utils';
import { useGetPackagesQuery } from '@rentify/apis';
import { useLanguage } from '../../../contexts/LanguageContext';
import { EASE } from '../../../components/site/motion';
import { NoteCard, SectionHeading } from './OnboardingFields';

// Feature ids such as "basic-dashboard" are permissions; the readable
// entries ("50 Products", "Custom Domain") are what customers compare.
const readableFeatures = (features) => {
  let list = features;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      list = [];
    }
  }
  list = Array.isArray(list) ? list : [];
  const readable = list.filter((feature) => /[A-Z0-9 ]/.test(feature));
  return (readable.length ? readable : list.map((feature) => feature.replace(/-/g, ' '))).slice(0, 5);
};

const periodKey = (duration = '') =>
  /year/i.test(duration) ? 'perYear' : /month/i.test(duration) ? 'perMonth' : null;

// The middle-priced plan is marked as the popular choice
const popularId = (plans) => (plans.length >= 3 ? plans[Math.floor(plans.length / 2)].id : null);

const PricingStep = ({ data, onUpdate }) => {
  const { t } = useLanguage();
  const { data: packageList, isLoading } = useGetPackagesQuery();
  const plans = useMemo(() => {
    const list = Array.isArray(packageList) ? packageList : packageList?.data || [];
    return [...list].filter((item) => item?.id).sort((a, b) => Number(a.price) - Number(b.price));
  }, [packageList]);
  const selected = plans.find((plan) => plan.id === data.package?.id) || data.package;
  const popular = popularId(plans);

  // Free plans start a trial; paid plans are paid by KHQR in the next step
  const dueToday = Number(selected?.price || 0);
  const isPaid = dueToday > 0;
  useEffect(() => {
    onUpdate({
      pricing: {
        billingPeriod: periodKey(selected?.duration) === 'perYear' ? 'yearly' : 'monthly',
        totalPrice: dueToday,
        basePrice: dueToday,
        addOnsPrice: 0,
        isTrial: !isPaid,
      },
    });
  }, [selected?.id]);

  const choose = (plan) => onUpdate({ package: plan, packageChosen: true });

  return (
    <section>
      <SectionHeading title={t('onboarding.plan.title')} description={t('onboarding.plan.description')} />

      <div className="grid gap-4 md:grid-cols-3">
        {isLoading &&
          [0, 1, 2].map((key) => <div key={key} className="h-[380px] animate-pulse rounded-[24px] bg-white" />)}
        {plans.map((plan, index) => {
          const active = selected?.id === plan.id;
          const period = periodKey(plan.duration);
          const price = Number(plan.price || 0);
          return (
            <motion.button
              key={plan.id}
              type="button"
              onClick={() => choose(plan)}
              aria-pressed={active}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: index * 0.06 }}
              className={cn(
                'relative flex min-h-[380px] flex-col rounded-[24px] bg-white p-6 text-left transition-all duration-300',
                active
                  ? 'ring-2 ring-[#0071e3] shadow-[0_24px_60px_-30px_rgba(0,113,227,0.55)]'
                  : 'ring-1 ring-black/[0.06] hover:-translate-y-1 hover:shadow-[0_24px_60px_-35px_rgba(0,0,0,0.35)]'
              )}
            >
              <div className="flex h-7 items-center justify-between">
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full ring-1 transition-colors',
                    active ? 'bg-[#0071e3] ring-[#0071e3]' : 'ring-black/25'
                  )}
                >
                  {active && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                </span>
                {plan.id === popular && (
                  <span className="rounded-full bg-[#0071e3]/10 px-2.5 py-1 text-[11px] font-semibold text-[#0071e3]">
                    {t('onboarding.plan.popular')}
                  </span>
                )}
              </div>

              <p className="mt-5 text-[19px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">{plan.name}</p>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="text-[40px] font-semibold tracking-[-0.03em] text-[#1d1d1f]">
                  ${price % 1 ? price.toFixed(2) : price}
                </span>
                {price > 0 && period && (
                  <span className="text-[14px] text-[#6e6e73]">{t(`onboarding.plan.${period}`)}</span>
                )}
              </p>
              <p className="mt-1 text-[13px] text-[#6e6e73]">
                {price > 0
                  ? t(periodKey(plan.duration) === 'perYear' ? 'onboarding.plan.billedYearly' : 'onboarding.plan.billedMonthly')
                  : plan.duration || t('onboarding.plan.free')}
              </p>

              <span className="my-5 h-px bg-black/[0.06]" />

              <ul className="space-y-2.5">
                {readableFeatures(plan.features).map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-[14px] leading-snug text-[#1d1d1f]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0071e3]" strokeWidth={2.2} />
                    <span className="first-letter:uppercase">{feature}</span>
                  </li>
                ))}
              </ul>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-stretch">
        <NoteCard
          icon={Info}
          title={t(isPaid ? 'onboarding.plan.paidNoteTitle' : 'onboarding.plan.noteTitle')}
          body={t(isPaid ? 'onboarding.plan.paidNoteBody' : 'onboarding.plan.noteBody')}
        />
        <div className="flex items-center justify-between gap-8 rounded-2xl bg-white px-5 py-4 ring-1 ring-black/[0.05]">
          <div>
            <p className="text-[12px] text-[#6e6e73]">{t('onboarding.pricingStep.dueToday')}</p>
            <p className="text-[13px] font-medium text-[#1d1d1f]">
              {!selected?.name
                ? '—'
                : isPaid
                  ? `${selected.name} · ${t('onboarding.plan.payKhqr')}`
                  : `${selected.name} · ${t('onboarding.ui.freeTrial')}`}
            </p>
          </div>
          <motion.p
            key={dueToday}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[28px] font-semibold tracking-[-0.02em] text-[#1d1d1f]"
          >
            ${dueToday.toFixed(2)}
          </motion.p>
        </div>
      </div>
    </section>
  );
};

export default PricingStep;
