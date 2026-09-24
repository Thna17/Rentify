import React, { useState, useEffect } from 'react';
import { Button } from '@rentify/shared/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@rentify/shared/ui/card';
import { Badge } from '@rentify/shared/ui/badge';
import { Input } from '@rentify/shared/ui/input';
import { Separator } from '@rentify/shared/ui/separator';
import { Check, CreditCard, Crown, Gift, Zap } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import StepHeader from './StepHeader';

// Available promo codes for future use
const PROMO_CODES = {
  WELCOME10: {
    discount: 10,
    type: 'percentage',
    description: '10% off after trial',
  },
};

// Static add-ons data
const ADD_ONS = [
  { id: 'seo', name: 'SEO Optimization', description: 'Improve your site visibility', price: 49 },
  { id: 'support', name: 'Priority Support', description: '24/7 priority support', price: 99 },
  { id: 'analytics', name: 'Advanced Analytics', description: 'Detailed analytics report', price: 79 },
];

const BENEFIT_KEYS = ['noPayment', 'noCard', 'cancel', 'fullAccess'];

const formatFeature = (feature) =>
  feature
    .replace(/-/g, ' ')
    .replace(/^\w/, (char) => char.toUpperCase());

const formatPrice = (value) => `$${Number(value || 0).toFixed(2)}`;

const PricingStep = ({ data, onUpdate }) => {
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(
    data.pricing?.appliedPromo || null
  );
  const [promoError, setPromoError] = useState(false);
  const { t } = useLanguage();
  const perMonth = t('onboarding.pricingStep.perMonth');

  // Free trial pricing calculation
  const calculatePricing = () => {
    const basePrice = data.package?.price || 0;

    // Calculate add-ons price
    let addOnsPrice = 0;
    if (data.services && data.services.length > 0) {
      addOnsPrice = data.services.reduce((total, serviceId) => {
        const addOn = ADD_ONS.find((a) => a.id === serviceId);
        const quantity = data.quantities?.[serviceId] || 1;
        return total + (addOn ? addOn.price * quantity : 0);
      }, 0);
    }

    const monthlyTotal = basePrice + addOnsPrice;

    // For free trial, everything is $0
    return {
      basePrice,
      addOnsPrice,
      savings: monthlyTotal, // Show what they're saving
      totalPrice: 0, // Always 0 for trial
      originalPrice: monthlyTotal, // Original price for comparison
    };
  };

  const applyPromoCode = () => {
    const promo = PROMO_CODES[promoCode.trim().toUpperCase()];
    setAppliedPromo(promo || null);
    setPromoError(!promo);
  };

  const pricing = calculatePricing();

  // Update parent with pricing data
  useEffect(() => {
    onUpdate({
      pricing: {
        billingPeriod: 'monthly',
        totalPrice: 0, // Always 0 for free trial
        basePrice: 0,
        addOnsPrice: 0,
        savings: pricing.savings,
        promoDiscount: 0,
        appliedPromo,
        isTrial: true,
      },
    });
  }, [appliedPromo]);

  const selectedAddOns = (data.services || [])
    .map((service) => {
      const serviceId = typeof service === 'string' ? service : service.id;
      const addOn = ADD_ONS.find((a) => a.id === serviceId);
      return addOn
        ? { ...addOn, quantity: data.quantities?.[serviceId] || 1 }
        : null;
    })
    .filter(Boolean);

  return (
    <div className="space-y-8">
      <StepHeader
        icon={CreditCard}
        title={t('onboarding.pricingStep.title')}
        description={t('onboarding.pricingStep.description')}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {/* Selected Package */}
          <Card className="gap-0 overflow-hidden py-0">
            <div className="flex items-center gap-4 bg-gradient-to-r from-blue-600 to-teal-500 p-6 text-white">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                <Crown className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-white/80">
                  {t('onboarding.pricingStep.selectedPackage')}
                </p>
                <p className="truncate text-xl font-bold">
                  {data.package?.name || t('onboarding.pricingStep.noPackage')}
                </p>
              </div>
              <Badge className="shrink-0 border-0 bg-white/20 text-white hover:bg-white/20">
                <Zap className="mr-1 h-3 w-3" />
                {t('onboarding.ui.freeTrial')}
                {data.package?.duration && ` · ${data.package.duration}`}
              </Badge>
            </div>

            {data.package?.features?.length > 0 && (
              <CardContent className="space-y-3 p-6">
                <p className="text-sm font-semibold text-foreground">
                  {t('onboarding.pricingStep.included')}
                </p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {data.package.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="h-4 w-4 shrink-0 text-green-600" />
                      {formatFeature(feature)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            )}
          </Card>

          {/* Selected Services */}
          {selectedAddOns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t('onboarding.pricingStep.addons')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedAddOns.map((addOn) => (
                  <div
                    key={addOn.id}
                    className="flex items-center justify-between gap-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {addOn.name}
                        {addOn.quantity > 1 && ` (x${addOn.quantity})`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {addOn.description}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground line-through">
                        {formatPrice(addOn.price * addOn.quantity)}
                      </p>
                      <p className="font-medium text-green-600">
                        $0{perMonth}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Promo Code for Future Use */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Gift className="h-4 w-4 text-pink-600" />
                {t('onboarding.pricingStep.promoTitle')}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('onboarding.pricingStep.promoHint')}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value);
                    setPromoError(false);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && applyPromoCode()}
                  placeholder={t('onboarding.pricingStep.promoPlaceholder')}
                  aria-invalid={promoError || undefined}
                  className="h-10"
                />
                <Button
                  variant="outline"
                  onClick={applyPromoCode}
                  disabled={!promoCode.trim()}
                >
                  {t('onboarding.pricingStep.promoSave')}
                </Button>
              </div>
              {promoError && (
                <p className="text-sm text-destructive">
                  {t('onboarding.pricingStep.promoInvalid')}
                </p>
              )}
              {appliedPromo && (
                <p className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                  <Check className="h-4 w-4" />
                  {t('onboarding.pricingStep.promoSaved')}{' '}
                  {appliedPromo.description}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pricing Summary */}
        <div className="lg:col-span-2">
          <Card className="lg:sticky lg:top-8">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">
                {t('onboarding.pricingStep.summaryTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <SummaryRow
                  label={t('onboarding.pricingStep.basePackage')}
                  original={formatPrice(pricing.basePrice)}
                  perMonth={perMonth}
                />
                {selectedAddOns.length > 0 && (
                  <SummaryRow
                    label={t('onboarding.pricingStep.addonsLabel')}
                    original={formatPrice(pricing.addOnsPrice)}
                    perMonth={perMonth}
                  />
                )}
              </div>

              {pricing.savings > 0 && (
                <div className="flex justify-between rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                  <span>{t('onboarding.pricingStep.savings')}</span>
                  <span className="font-semibold">
                    {formatPrice(pricing.savings)}
                  </span>
                </div>
              )}

              <Separator />

              <div className="flex items-end justify-between">
                <span className="font-semibold text-foreground">
                  {t('onboarding.pricingStep.dueToday')}
                </span>
                <span className="text-3xl font-bold text-foreground">$0</span>
              </div>

              <Separator />

              <ul className="space-y-2">
                {BENEFIT_KEYS.map((key) => (
                  <li
                    key={key}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="h-4 w-4 shrink-0 text-green-600" />
                    {t(`onboarding.pricingStep.${key}`)}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const SummaryRow = ({ label, original, perMonth }) => (
  <div className="flex items-center justify-between">
    <span className="text-muted-foreground">{label}</span>
    <span className="flex items-baseline gap-2">
      <span className="text-xs text-muted-foreground line-through">
        {original}
        {perMonth}
      </span>
      <span className="font-semibold text-green-600">
        $0{perMonth}
      </span>
    </span>
  </div>
);

export default PricingStep;
