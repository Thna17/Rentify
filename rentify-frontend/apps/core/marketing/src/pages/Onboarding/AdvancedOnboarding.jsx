import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@rentify/shared/ui/button';
import { Badge } from '@rentify/shared/ui/badge';
import { cn } from '@rentify/utils';
import { useLanguage } from '../../contexts/LanguageContext';
import Stepper from './components/Stepper';
import BusinessDetailsStep from './components/BusinessDetailsStep';
import TemplatePickStep from './components/TemplatePickStep';
import PricingStep from './components/PricingStep';
import DeploymentStep from './DeploymentStep/DeploymentStep';

// Icons
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Languages,
  Palette,
  CreditCard,
  Rocket,
  Save,
  Sparkles,
} from 'lucide-react';
import { useGetPackageByIdQuery } from '@rentify/apis';

const BrandMark = ({ tagline }) => (
  <Link to="/" className="flex items-center gap-3">
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 shadow-lg shadow-blue-600/20">
      <Sparkles className="h-5 w-5 text-white" />
    </span>
    <span className="flex flex-col leading-tight">
      <span className="text-lg font-bold text-foreground">Rentify</span>
      {tagline && (
        <span className="text-xs font-medium text-muted-foreground">
          {tagline}
        </span>
      )}
    </span>
  </Link>
);

const Onboarding = () => {
  const { t, language, toggleLanguage } = useLanguage();
  const { packageId } = useParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [lastSaved, setLastSaved] = useState(null);
  const isKhmer = language === 'KH';

  const { data: packageData } = useGetPackageByIdQuery(packageId);

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

  // Update form data when package data is loaded
  useEffect(() => {
    if (packageData && !formData.package) {
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
  }, [packageData, formData.package]);

  const steps = useMemo(
    () => [
      {
        id: 1,
        title: t('onboarding.business'),
        description: t('onboarding.ui.businessDesc'),
        icon: Briefcase,
        component: BusinessDetailsStep,
      },
      {
        id: 2,
        title: t('onboarding.template'),
        description: t('onboarding.ui.templateDesc'),
        icon: Palette,
        component: TemplatePickStep,
      },
      {
        id: 3,
        title: t('onboarding.pricing'),
        description: t('onboarding.ui.pricingDesc'),
        icon: CreditCard,
        component: PricingStep,
      },
      {
        id: 4,
        title: t('onboarding.deployment'),
        description: t('onboarding.ui.deploymentDesc'),
        icon: Rocket,
        component: DeploymentStep,
      },
    ],
    [t]
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
      case 1: {
        const { name, location, contact, email } =
          formData.businessDetails || {};
        return name && location && contact && email;
      }
      case 2:
        return !!formData.template;
      case 3:
        // Pricing step is always complete for free trial
        return true;
      default:
        return true;
    }
  }, [currentStep, formData]);

  const continueLabel =
    currentStep === 3 ? t('onboarding.ui.startTrial') : t('onboarding.continue');

  const languageToggle = (
    <Button variant="outline" size="sm" onClick={toggleLanguage}>
      <Languages className="mr-2 h-4 w-4" />
      {isKhmer ? 'English' : 'ខ្មែរ'}
    </Button>
  );

  return (
    <div
      className={cn(
        'min-h-screen bg-muted/40 lg:grid lg:grid-cols-[20rem_1fr]',
        isKhmer && 'font-khmer'
      )}
    >
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col gap-10 border-r bg-background p-8 lg:flex">
        <BrandMark tagline={t('onboarding.ui.tagline')} />

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {t('onboarding.ui.setupTitle')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('onboarding.ui.setupSubtitle')}
          </p>
        </div>

        <Stepper
          steps={steps}
          currentStep={currentStep}
          onStepClick={setCurrentStep}
        />

        <div className="mt-auto space-y-4">
          {formData.package && (
            <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-teal-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('onboarding.ui.yourPlan')}
              </p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="truncate font-semibold text-foreground">
                  {formData.package.name}
                </p>
                <Badge className="shrink-0 bg-green-100 text-green-700 hover:bg-green-100">
                  {t('onboarding.ui.freeTrial')}
                </Badge>
              </div>
              {formData.package.duration && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {formData.package.duration}
                </p>
              )}
            </div>
          )}
          <div className="flex items-center justify-between">
            <Link
              to="/"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t('onboarding.ui.backHome')}
            </Link>
            {languageToggle}
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur-md lg:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <BrandMark />
            {languageToggle}
          </div>
          <div className="space-y-2 px-4 pb-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">
                {steps[currentStep - 1].title}
              </span>
              <span className="text-muted-foreground">{stepLabel}</span>
            </div>
            <Stepper steps={steps} currentStep={currentStep} variant="compact" />
          </div>
        </header>

        <main className="flex-1 px-4 py-8 md:px-10 md:py-12">
          <div className="mx-auto max-w-5xl">
            <div className="mb-6 hidden items-center justify-between lg:flex">
              <Badge variant="outline" className="bg-background">
                {stepLabel}
              </Badge>
              {lastSaved && !isFinalStep && (
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Save className="h-3 w-3" />
                  {t('onboarding.ui.autoSaved')} {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>

            <CurrentStepComponent
              data={formData}
              onUpdate={updateFormData}
              onNext={nextStep}
            />
          </div>
        </main>

        {!isFinalStep && (
          <footer className="sticky bottom-0 z-10 border-t bg-background/90 backdrop-blur-md">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 md:px-10">
              <Button
                variant="ghost"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('onboarding.previous')}
              </Button>

              <Button
                onClick={nextStep}
                disabled={!isStepComplete()}
                size="lg"
                className="bg-blue-600 px-6 hover:bg-blue-700"
              >
                {continueLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
