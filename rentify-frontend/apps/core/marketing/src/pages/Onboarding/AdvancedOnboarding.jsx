import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@rentify/utils';
import { LanguageToggle, Wordmark } from '../../components/site/SiteHeader';
import { EASE } from '../../components/site/motion';
import { useLanguage } from '../../contexts/LanguageContext';
import EssentialsStep from './components/EssentialsStep';
import BrandStep from './components/BrandStep';
import PricingStep from './components/PricingStep';
import PlanPaymentStep from './components/PlanPaymentStep';
import DeploymentStep from './DeploymentStep/DeploymentStep';

// Icons
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  Cloud,
  Palette,
  CreditCard,
  Rocket,
  ShieldCheck,
} from 'lucide-react';
import { useGetPackagesQuery } from '@rentify/apis';
import { isEssentialsComplete } from './businessDetails';
import { resolvePackage } from './resolvePackage';

const Onboarding = () => {
  const { t, language } = useLanguage();
  const { packageId } = useParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [lastSaved, setLastSaved] = useState(null);
  const isKhmer = language === 'KH';

  const { data: packageList } = useGetPackagesQuery();
  const packageData = useMemo(
    () => resolvePackage(Array.isArray(packageList) ? packageList : packageList?.data, packageId),
    [packageList, packageId]
  );

  const [formData, setFormData] = useState(() => {
    const savedData = localStorage.getItem('rentify-onboarding');
    return savedData
      ? JSON.parse(savedData)
      : {
          businessDetails: {
            name: '',
            logo: null,
            location: '',
            contact: '',
            email: '',
          },
          template: null,
          package: null,
          services: [],
          quantities: {},
          pricing: {
            basePrice: 0,
            addOnsPrice: 0,
            totalPrice: 0,
            appliedPromo: null,
            billingPeriod: 'monthly',
          },
        };
  });

  // Use the package Core has for this link. Progress saved in the browser may
  // hold a package from an older database, so replace it when it differs,
  // unless the merchant picked a plan in step 3 that Core still has.
  const packages = Array.isArray(packageList) ? packageList : packageList?.data;
  const keepsChosenPlan =
    formData.packageChosen && packages?.some((item) => item.id === formData.package?.id);
  useEffect(() => {
    if (packageData && !keepsChosenPlan && formData.package?.id !== packageData.id) {
      setFormData((prev) => ({
        ...prev,
        package: packageData,
        pricing: {
          ...prev.pricing,
          basePrice: packageData.price || 0,
          totalPrice: 0, // Free trial
        },
      }));
    }
  }, [packageData, keepsChosenPlan, formData.package?.id]);

  // Paid plans get a KHQR payment step before the store is created
  const isPaidPlan = Number(formData.package?.price || 0) > 0;
  const steps = useMemo(
    () => [
      {
        id: 1,
        title: t('onboarding.essentials.step'),
        description: t('onboarding.essentials.stepDesc'),
        icon: Briefcase,
        component: EssentialsStep,
      },
      {
        id: 2,
        title: t('onboarding.brand.step'),
        description: t('onboarding.brand.stepDesc'),
        icon: Palette,
        component: BrandStep,
      },
      {
        id: 3,
        title: t('onboarding.plan.step'),
        description: t('onboarding.plan.stepDesc'),
        icon: CreditCard,
        component: PricingStep,
      },
      ...(isPaidPlan
        ? [
            {
              id: 'payment',
              title: t('onboarding.khqr.step'),
              description: t('onboarding.khqr.stepDesc'),
              icon: CreditCard,
              component: PlanPaymentStep,
            },
          ]
        : []),
      {
        id: 'deploy',
        title: t('onboarding.deployment'),
        description: t('onboarding.ui.deploymentDesc'),
        icon: Rocket,
        component: DeploymentStep,
      },
    ],
    [t, isPaidPlan]
  );

  const isFinalStep = currentStep === steps.length;
  const CurrentStepComponent = steps[currentStep - 1].component;
  const stepLabel = `${t('onboarding.step')} ${currentStep} ${t(
    'onboarding.of'
  )} ${steps.length}`;

  // Auto-save logic
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('rentify-onboarding', JSON.stringify(formData));
      setLastSaved(new Date());
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData]);

  // Start each step at the top of the page
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  const updateFormData = useCallback((stepData) => {
    setFormData((prev) => ({ ...prev, ...stepData }));
  }, []);

  const nextStep = useCallback(() => {
    if (!isFinalStep) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isFinalStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const isStepComplete = useCallback(() => {
    switch (currentStep) {
      case 1:
        return isEssentialsComplete(formData.businessDetails);
      case 2:
        return !!formData.template;
      case 3:
        return !!formData.package;
      case 4:
        // Payment step (paid plans only): the KHQR payment for this plan is complete
        return !isPaidPlan || formData.payment?.packageId === formData.package?.id;
      default:
        return true;
    }
  }, [currentStep, formData]);

  const continueLabel =
    currentStep === 3 ? t(isPaidPlan ? 'onboarding.plan.continuePay' : 'onboarding.ui.startTrial') : t('onboarding.continue');

  const progress = (currentStep / steps.length) * 100;

  return (
    <div className={cn('min-h-screen bg-[#f5f5f7] text-[#1d1d1f]', isKhmer && 'font-khmer')}>
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/80 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Wordmark />
          <div className="flex items-center gap-2 sm:gap-4">
            {lastSaved && !isFinalStep && (
              <span className="hidden items-center gap-1.5 text-[12px] text-[#6e6e73] sm:flex">
                <Cloud className="h-3.5 w-3.5" />
                {t('onboarding.ui.autoSaved')} {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <LanguageToggle />
            <Link
              to="/"
              className="rounded-full px-3 py-1.5 text-[13px] font-medium text-[#0071e3] transition-colors hover:bg-[#0071e3]/[0.08]"
            >
              {t('onboarding.ui.saveExit')}
            </Link>
          </div>
        </div>
        <div className="h-[3px] bg-black/[0.04]">
          <motion.div
            className="h-full bg-[#0071e3]"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: EASE }}
          />
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(280px,21rem)_1fr]">
        {/* Journey panel */}
        <aside className="sticky top-[67px] hidden h-[calc(100vh-67px)] flex-col gap-10 overflow-hidden bg-[#0b0f17] p-8 text-white lg:flex xl:p-10">
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-[#0071e3]/25 blur-[100px]"
          />
          <div className="relative">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64a8ff]">
              {t('onboarding.ui.eyebrow')}
            </p>
            <h1 className="mt-4 text-[34px] font-semibold leading-[1.08] tracking-[-0.03em]">
              {t('onboarding.ui.setupTitle')}
            </h1>
            <p className="mt-4 text-[14px] leading-relaxed text-white/60">
              {t('onboarding.ui.setupSubtitle')}
            </p>
          </div>

          <nav className="relative space-y-1" aria-label="Progress">
            {steps.map((step, index) => {
              const number = index + 1;
              const done = currentStep > number;
              const active = currentStep === number;
              return (
                <button
                  key={step.id}
                  type="button"
                  disabled={!done}
                  onClick={() => done && setCurrentStep(number)}
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'relative flex w-full items-center gap-3.5 rounded-2xl px-3 py-3 text-left transition-colors',
                    active ? 'text-white' : done ? 'text-white/80 hover:bg-white/[0.06]' : 'cursor-default text-white/40'
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="onboarding-step"
                      className="absolute inset-0 rounded-2xl bg-white/[0.08] ring-1 ring-white/10"
                      transition={{ duration: 0.5, ease: EASE }}
                    />
                  )}
                  <span
                    className={cn(
                      'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ring-1 transition-colors',
                      active
                        ? 'bg-[#0071e3] text-white ring-[#0071e3]'
                        : done
                        ? 'bg-white/15 text-white ring-white/15'
                        : 'ring-white/20'
                    )}
                  >
                    {done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : number}
                  </span>
                  <span className="relative min-w-0">
                    <span className="block truncate text-[14px] font-medium">{step.title}</span>
                    <span className="block truncate text-[12px] opacity-60">{step.description}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="relative mt-auto space-y-3">
            {formData.package && (
              <div className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
                <p className="text-[11px] uppercase tracking-[0.14em] text-white/50">
                  {t('onboarding.ui.yourPlan')}
                </p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <p className="truncate text-[15px] font-semibold">{formData.package.name}</p>
                  <span className="shrink-0 rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                    {isPaidPlan ? `$${Number(formData.package.price).toFixed(2)}` : t('onboarding.ui.freeTrial')}
                  </span>
                </div>
              </div>
            )}
            <div className="flex gap-3 rounded-2xl p-1 text-white/60">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#64a8ff]" />
              <p className="text-[12px] leading-relaxed">
                <span className="block font-medium text-white/85">{t('onboarding.ui.accountTitle')}</span>
                {t('onboarding.ui.accountBody')}
              </p>
            </div>
          </div>
        </aside>

        <div className="flex min-h-[calc(100vh-67px)] min-w-0 flex-col">
          <main className="flex-1 px-4 py-8 sm:px-6 md:py-12 lg:px-10 xl:px-14">
            <div className="mx-auto max-w-5xl">
              <div className="min-w-0">
                <p className="mb-5 text-[13px] font-medium text-[#0071e3]">
                  {stepLabel}
                  <span className="text-[#6e6e73] lg:hidden"> · {steps[currentStep - 1].title}</span>
                </p>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.45, ease: EASE }}
                  >
                    <CurrentStepComponent data={formData} onUpdate={updateFormData} onNext={nextStep} />
                  </motion.div>
                </AnimatePresence>
              </div>

            </div>
          </main>

          {!isFinalStep && (
            <footer className="sticky bottom-0 z-20 border-t border-black/[0.06] bg-white/80 backdrop-blur-xl">
              <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-10 xl:px-14">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="flex h-11 items-center gap-2 rounded-full px-4 text-[15px] text-[#1d1d1f] transition-colors hover:bg-black/[0.05] disabled:pointer-events-none disabled:opacity-30"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('onboarding.previous')}
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!isStepComplete()}
                  className="group flex h-11 items-center gap-2 rounded-full bg-[#0071e3] px-6 text-[15px] font-medium text-white shadow-[0_8px_20px_-8px_rgba(0,113,227,0.6)] transition-all hover:bg-[#0077ed] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#0071e3]/35 disabled:shadow-none"
                >
                  {continueLabel}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </footer>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
