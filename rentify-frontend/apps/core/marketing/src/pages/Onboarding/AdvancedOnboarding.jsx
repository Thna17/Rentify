import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@rentify/shared/ui/button';
import { Card, CardContent } from '@rentify/shared/ui/card';
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
  Palette,
  CreditCard,
  Rocket,
  Save,
} from 'lucide-react';
import { useGetPackageByIdQuery } from '@rentify/apis';

const Onboarding = () => {
  const { t, language, toggleLanguage } = useLanguage();
  const { packageId } = useParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [lastSaved, setLastSaved] = useState(null);

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
        icon: Briefcase,
        component: BusinessDetailsStep,
      },
      {
        id: 2,
        title: t('onboarding.template'),
        icon: Palette,
        component: TemplatePickStep,
      },
      {
        id: 3,
        title: t('onboarding.pricing'),
        icon: CreditCard,
        component: PricingStep,
      },
      {
        id: 4,
        title: t('onboarding.deployment'),
        icon: Rocket,
        component: DeploymentStep,
      },
    ],
    [t]
  );

  const isFinalStep = currentStep === steps.length;
  const CurrentStepComponent = steps[currentStep - 1].component;

  // Auto-save logic
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('rentify-onboarding', JSON.stringify(formData));
      setLastSaved(new Date());
    }, 1000);

    return () => clearTimeout(timer);
  }, [formData]);

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
        const { name, location, contact, email, primaryCategory } =
          formData.businessDetails || {};
        return name && location && contact && email && primaryCategory;
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

  const getContinueButtonText = useCallback(() => {
    const isKhmer = language === 'KH';

    if (currentStep === 3) {
      // Always show "Start Free Trial" for pricing step
      return isKhmer ? 'ចាប់ផ្ដើម试用ឥតគិតថ្លៃ' : 'Start Free Trial';
    }

    return isKhmer ? 'បន្ត' : 'Continue';
  }, [currentStep, language]);

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          <Link
            to="/"
            className="text-xl font-bold tracking-tight text-primary"
          >
            Rentify
          </Link>
          <Button variant="outline" size="sm" onClick={toggleLanguage}>
            {language === 'KH' ? 'English' : 'ខ្មែរ'}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-16">
        <Stepper
          steps={steps}
          currentStep={currentStep}
          onStepClick={setCurrentStep}
        />

        <Card className="mx-auto max-w-5xl shadow-sm mt-16">
          <CardContent className="p-6 md:p-10">
            {lastSaved && !isFinalStep && (
              <div className="mb-6 flex items-center justify-end gap-2 text-xs text-gray-500">
                <Save className="h-3 w-3" />
                {language === 'KH'
                  ? 'បានរក្សាទុកដោយស្វ័យប្រវត្តិនៅ'
                  : 'Auto-saved at'}
                {lastSaved.toLocaleTimeString()}
              </div>
            )}

            <CurrentStepComponent
              data={formData}
              onUpdate={updateFormData}
              onNext={nextStep}
            />
          </CardContent>

          {!isFinalStep && (
            <div className="border-t bg-muted/50 p-6 flex items-center justify-between">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {language === 'KH' ? 'ត្រឡប់ក្រោយ' : 'Previous'}
              </Button>

              <Button
                onClick={nextStep}
                disabled={!isStepComplete()}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                {getContinueButtonText()}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

export default Onboarding;
