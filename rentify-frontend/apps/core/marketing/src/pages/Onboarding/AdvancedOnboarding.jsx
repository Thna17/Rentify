import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@rentify/utils';
import { RENTIFY_API_BASE, DASHBOARD_URL } from '@rentify/shared/config/urls';
import { LanguageToggle, Wordmark } from '../../components/site/SiteHeader';
import { EASE } from '../../components/site/motion';
import { useLanguage } from '../../contexts/LanguageContext';
import EssentialsStep from './components/EssentialsStep';
import BrandStep, { toTemplate } from './components/BrandStep';
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
  CreditCard,
  Palette,
  Rocket,
  ShieldCheck,
} from 'lucide-react';
import { useGetPackagesQuery, useGetTemplatesQuery } from '@rentify/apis';
import { isEssentialsComplete } from './businessDetails';
import { resolvePackage } from './resolvePackage';

// One form is enough to open a store: Rentify picks a template that suits the
// category and starts the Free plan. Design and plan change later in the dashboard.
const TEMPLATE_HINTS = [
  { match: /beauty|skin|cosmetic/i, template: /skin|beauty/i },
  { match: /food|beverage|cafe|coffee|drink|grocer/i, template: /coffee|cafe|food/i },
  { match: /electronic|tech|phone|gadget/i, template: /tech|electronic/i },
];
const limitsOf = (plan) => {
  if (!plan?.limits) return {};
  if (typeof plan.limits !== 'string') return plan.limits;
  try { return JSON.parse(plan.limits); } catch { return {}; }
};
const pickTemplate = (templates, category = '') => {
  const hint = TEMPLATE_HINTS.find((item) => item.match.test(category));
  const byHint = hint && templates.find((item) => hint.template.test(`${item.name} ${item.category}`));
  return byHint || templates.find((item) => item.category === 'ecommerce') || templates[0] || null;
};

const Onboarding = () => {
  const { t, language } = useLanguage();
  const { packageId } = useParams();
  const [searchParams] = useSearchParams();
  const requestedPackage = packageId || searchParams.get('plan') || searchParams.get('packageId');

  const stepParam = searchParams.get('step');
  const [currentStep, setCurrentStep] = useState(() => {
    if (stepParam === 'template' || stepParam === 'brand' || stepParam === '2') return 2;
    if (stepParam === 'pricing' || stepParam === 'plan' || stepParam === '3') return 3;
    if (stepParam === 'payment' || stepParam === '4') return 4;
    return 1;
  });
  const [lastSaved, setLastSaved] = useState(null);
  const isKhmer = language === 'KH';

  const { data: packageList } = useGetPackagesQuery();
  const { data: apiTemplates = [] } = useGetTemplatesQuery();
  const templates = useMemo(() => apiTemplates.map(toTemplate), [apiTemplates]);
  const packageData = useMemo(() => {
    const list = Array.isArray(packageList) ? packageList : packageList?.data;
    // The plan named in the link (e.g. /onboarding/pro), else Starter: a plan
    // with its own storefront and a free trial, so nothing is due today
    return resolvePackage(list, requestedPackage);
  }, [packageList, requestedPackage]);

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

  // Rentify fills design and plan in; anything the merchant picks themselves wins
  useEffect(() => {
    if (packageData && !formData.packageChosen && formData.package?.id !== packageData.id) {
      setFormData((prev) => ({
        ...prev,
        package: packageData,
        payment: null,
        pricing: { ...prev.pricing, basePrice: packageData.price || 0, totalPrice: 0 },
      }));
    }
  }, [packageData, formData.packageChosen, formData.package?.id]);

  const category = formData.businessDetails?.primaryCategory;
  useEffect(() => {
    if (formData.templateChosen) return;
    const template = pickTemplate(templates, category);
    if (template && template.id !== formData.template?.id) {
      setFormData((prev) => ({ ...prev, template }));
    }
  }, [templates, category, formData.templateChosen, formData.template?.id]);

  // If the user already has a store, direct them to their dashboard
  useEffect(() => {
    fetch(`${RENTIFY_API_BASE}/api/stores/mine`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const store = data?.data || data;
        if (store && store.id) {
          window.location.replace(`${(DASHBOARD_URL || 'https://rentify-seller.mekhla.digital').replace(/\/+$/, '')}/overview`);
        }
      })
      .catch(() => undefined);
  }, []);

  // Auto-fill contact details if the user is already authenticated
  useEffect(() => {
    fetch(`${RENTIFY_API_BASE}/api/auth/me`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const u = data?.user || data?.data;
        if (u) {
          setFormData((prev) => {
            const isDifferentUser = prev.savedUserId && prev.savedUserId !== u.id;
            return {
              ...prev,
              savedUserId: u.id,
              ...(isDifferentUser ? { payment: null } : {}),
              businessDetails: {
                ...prev.businessDetails,
                email: prev.businessDetails?.email || u.email || '',
                contact: prev.businessDetails?.contact || u.phoneNumber || '',
                name: prev.businessDetails?.name || u.name || '',
              },
            };
          });
        }
      })
      .catch(() => undefined);
  }, []);

  // Every paid plan, trial or not, pays with KHQR before the store is created
  const isPaidPlan = Number(formData.package?.price || 0) > 0;
  const fill = (key, name) => t(key).replace('{name}', name || '');
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
        description: formData.template
          ? fill('onboarding.auto.design', formData.template.name)
          : t('onboarding.brand.stepDesc'),
        icon: Palette,
        component: BrandStep,
      },
      {
        id: 3,
        title: t('onboarding.plan.step'),
        description: formData.package
          ? fill('onboarding.auto.plan', formData.package.name)
          : t('onboarding.plan.stepDesc'),
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
    [t, isPaidPlan, formData.template, formData.package]
  );

  const isFinalStep = currentStep === steps.length;
  const CurrentStepComponent = steps[currentStep - 1].component;
  const stepLabel = `${t('onboarding.step')} ${currentStep} ${t('onboarding.of')} ${steps.length}`;

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
    setFormData((prev) => ({
      ...prev,
      ...stepData,
      ...('template' in stepData ? { templateChosen: true } : {}),
    }));
  }, []);

  const nextStep = useCallback(() => {
    if (isFinalStep) return;
    if (steps[currentStep - 1]?.id === 1) {
      // Design and plan are already filled in; they stay one click away in the list
      const next = steps.findIndex((item) => item.id === 'payment' || item.id === 'deploy');
      setCurrentStep(next + 1);
      return;
    }
    setCurrentStep((prev) => prev + 1);
  }, [isFinalStep, steps, currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const isComplete = useCallback(
    (step) => {
      switch (steps[step - 1]?.id) {
        case 1:
          return isEssentialsComplete(formData.businessDetails) && !!formData.template && !!formData.package;
        case 2:
          return !!formData.template;
        case 3:
          return !!formData.package;
        case 'payment':
          return (
            formData.payment?.packageId === formData.package?.id &&
            Boolean(formData.payment?.paymentId) &&
            formData.payment?.status === 'completed'
          );
        default:
          return true;
      }
    },
    [formData, steps]
  );

  const isStepComplete = useCallback(() => isComplete(currentStep), [isComplete, currentStep]);

  // A step can be opened when every step before it is finished, so finished
  // steps stay reachable after going back, without clicking Continue each time.
  const canOpenStep = useCallback(
    (number) => Array.from({ length: number - 1 }, (_, i) => i + 1).every(isComplete),
    [isComplete]
  );

  const continueLabel =
    steps[currentStep - 1]?.id === 1 || steps[currentStep - 1]?.id === 3
      ? t(isPaidPlan ? 'onboarding.plan.continuePay' : 'onboarding.ui.startTrial')
      : t('onboarding.continue');

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
              {isKhmer
                ? t('onboarding.ui.setupSubtitle')
                : `${steps.length === 4 ? 'Four' : 'Five'} quick steps to get your business online.`}
            </p>
          </div>

          <nav className="relative space-y-1" aria-label="Progress">
            {steps.map((step, index) => {
              const number = index + 1;
              const active = currentStep === number;
              const done = !active && isComplete(number) && number < steps.length;
              const reachable = active || canOpenStep(number);
              return (
                <button
                  key={step.id}
                  type="button"
                  disabled={!reachable}
                  onClick={() => reachable && setCurrentStep(number)}
                  aria-current={active ? 'step' : undefined}
                  className={cn(
                    'relative flex w-full items-center gap-3.5 rounded-2xl px-3 py-3 text-left transition-colors',
                    active ? 'text-white' : reachable ? 'text-white/80 hover:bg-white/[0.06]' : 'cursor-default text-white/40'
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
                    {isPaidPlan ? `$${Number(formData.package.price).toFixed(2)}/mo` : 'Free'}
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
                    onKeyDown={(event) => {
                      // Fields aren't inside a <form>, so Enter in a text field moves on like Continue
                      if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
                      if (event.target.tagName !== 'INPUT' || ['checkbox', 'radio', 'file'].includes(event.target.type)) return;
                      event.preventDefault();
                      if (!isFinalStep && isStepComplete()) nextStep();
                    }}
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
