import React, { useState, useEffect } from 'react';
import { Button } from '@rentify/shared/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@rentify/shared/ui/card';
import { Badge } from '@rentify/shared/ui/badge';
import { Check, Gift, Crown, Zap } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';

const PricingStep = ({ data, onUpdate, onNext }) => {
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const { language, t } = useLanguage();
  console.log(data);
  

  const isLanguageKh = language === 'KH';

  // Available promo codes for future use
  const promoCodes = {
    WELCOME10: {
      discount: 10,
      type: 'percentage',
      description: '10% off after trial',
    },
  };

  // Free trial pricing calculation
  const calculatePricing = () => {
    const basePrice = data.package?.price || 0;
    
    // Calculate add-ons price
    let addOnsPrice = 0;
    if (data.services && data.services.length > 0) {
      addOnsPrice = data.services.reduce((total, serviceId) => {
        const addOn = addOns.find((a) => a.id === serviceId);
        const quantity = data.quantities?.[serviceId] || 1;
        return total + (addOn ? addOn.price * quantity : 0);
      }, 0);
    }

    const monthlyTotal = basePrice + addOnsPrice;

    // For free trial, everything is $0
    return {
      basePrice: 0, // Free during trial
      addOnsPrice: 0, // Free during trial
      monthlyTotal: 0, // Free during trial
      annualTotal: 0, // Free during trial
      savings: monthlyTotal, // Show what they're saving
      promoDiscount: 0,
      totalPrice: 0, // Always 0 for trial
      displayPrice: 0,
      originalPrice: monthlyTotal, // Original price for comparison
    };
  };

  const applyPromoCode = () => {
    const promo = promoCodes[promoCode.toUpperCase()];
    if (promo) {
      setAppliedPromo(promo);
      // Show message that promo will apply after trial
      alert(isLanguageKh 
        ? 'កូដបញ្ចុះតម្លៃនឹងត្រូវបានអនុវត្តបន្ទាប់ពីការសាកល្បងឥតគិតថ្លៃ!'
        : 'Promo code will be applied after your free trial!'
      );
    } else {
      alert(isLanguageKh ? 'លេខកូដមិនត្រឹមត្រូវ' : 'Invalid promo code');
    }
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

  // Static add-ons data
  const addOns = [
    { 
      id: 'seo', 
      name: 'SEO Optimization', 
      nameKh: 'SEO Optimization', 
      description: 'Improve your site visibility', 
      descriptionKh: 'Improve your site visibility', 
      price: 49 
    },
    { 
      id: 'support', 
      name: 'Priority Support', 
      nameKh: 'Priority Support', 
      description: '24/7 priority support', 
      descriptionKh: '24/7 priority support', 
      price: 99 
    },
    { 
      id: 'analytics', 
      name: 'Advanced Analytics', 
      nameKh: 'Advanced Analytics', 
      description: 'Detailed analytics report', 
      descriptionKh: 'Detailed analytics report', 
      price: 79 
    },
  ];

  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full mb-4">
          <Zap className="w-4 h-4 mr-2" />
          <span className={isLanguageKh ? 'font-khmer' : ''}>
            {isLanguageKh ? '១ខែ试用ឥតគិតថ្លៃ' : '1 Month Free Trial'}
          </span>
        </div>
        <h2 className={`text-3xl font-bold text-gray-900 mb-4 ${isLanguageKh ? 'font-khmer' : ''}`}>
          {isLanguageKh ? 'ការសង្ខេបតម្លៃ试用' : 'Pricing Summary'}
        </h2>
        <p className={`text-lg text-gray-600 max-w-3xl mx-auto ${isLanguageKh ? 'font-khmer' : ''}`}>
          {isLanguageKh 
            ? 'សាកល្បងសេវាកម្មរបស់យើងដោយឥតគិតថ្លៃរយៈពេល ១ខែ។ គ្មានការទូទាត់ទេ!'
            : 'Try our services free for 1 month. No payment required!'
          }
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Package & Services Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Free Trial Banner */}
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className={`text-xl font-bold text-gray-900 ${isLanguageKh ? 'font-khmer' : ''}`}>
                    {isLanguageKh ? '试用ឥតគិតថ្លៃ ១ខែ' : '1 Month Free Trial'}
                  </h3>
                  <p className={`text-gray-600 ${isLanguageKh ? 'font-khmer' : ''}`}>
                    {isLanguageKh 
                      ? 'គ្មានការទូទាត់ គ្មានការបង់ប្រាក់។ ចាប់ផ្ដើមដំឡើងឥឡូវនេះ!'
                      : 'No payment, no credit card required. Start deploying now!'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Package */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center space-x-2 ${isLanguageKh ? 'font-khmer' : ''}`}>
                <Crown className="w-5 h-5 text-blue-600" />
                <span>{isLanguageKh ? 'កញ្ចប់ដែលបានជ្រើសរើស' : 'Selected Package'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.package ? (
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className={`text-xl font-bold text-gray-900 ${isLanguageKh ? 'font-khmer' : ''}`}>
                      {isLanguageKh ? data.package.nameKh : data.package.name}
                    </h3>
                    <p className={`text-gray-600 ${isLanguageKh ? 'font-khmer' : ''}`}>
                      {isLanguageKh ? data.package.descriptionKh : data.package.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {data.package.features?.map((feature) => (
                        <Badge key={feature} variant="secondary" className="text-xs">
                          {feature.charAt(0).toUpperCase() + feature.slice(1)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900 line-through text-gray-400">
                      ${data.package.price}
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      $0
                    </div>
                    <div className={`text-sm text-gray-600 ${isLanguageKh ? 'font-khmer' : ''}`}>
                      /{isLanguageKh ? 'ខែ试用' : 'month trial'}
                    </div>
                  </div>
                </div>
              ) : (
                <p className={`text-gray-500 italic ${isLanguageKh ? 'font-khmer' : ''}`}>
                  {isLanguageKh ? 'មិនបានជ្រើសរើសកញ្ចប់' : 'No package selected'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Selected Services */}
          {data.services && data.services.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className={`flex items-center space-x-2 ${isLanguageKh ? 'font-khmer' : ''}`}>
                  <Check className="w-5 h-5 text-green-600" />
                  <span>{isLanguageKh ? 'សេវាកម្មបន្ថែម' : 'Additional Services'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.services.map((service) => {
                    const serviceId = typeof service === 'string' ? service : service.id;
                    const addOn = addOns.find((a) => a.id === serviceId);
                    const quantity = data.quantities?.[serviceId] || 1;
                    if (!addOn) return null;
                    return (
                      <div key={serviceId} className="flex justify-between items-center">
                        <div>
                          <span className={`text-gray-700 ${isLanguageKh ? 'font-khmer' : ''}`}>
                            {isLanguageKh ? addOn.nameKh : addOn.name}
                            {quantity > 1 && ` (x${quantity})`}
                          </span>
                          <p className={`text-xs text-gray-600 ${isLanguageKh ? 'font-khmer' : ''}`}>
                            {isLanguageKh ? addOn.descriptionKh : addOn.description}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-gray-400 line-through text-sm">
                            ${(addOn.price * quantity).toFixed(2)}
                          </div>
                          <span className="font-medium text-green-600">
                            $0/{isLanguageKh ? 'ខែ' : 'mo'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Promo Code for Future Use */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center space-x-2 ${isLanguageKh ? 'font-khmer' : ''}`}>
                <Gift className="w-5 h-5 text-pink-600" />
                <span>{isLanguageKh ? 'លេខកូដបញ្ចុះតម្លៃ' : 'Promo Code'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder={isLanguageKh ? 'បញ្ចូលលេខកូដ' : 'Enter promo code'}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Button
                  variant="outline"
                  onClick={applyPromoCode}
                  className={isLanguageKh ? 'font-khmer' : ''}
                >
                  {isLanguageKh ? 'រក្សាទុក' : 'Save'}
                </Button>
              </div>
              {appliedPromo && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className={`text-green-800 text-sm ${isLanguageKh ? 'font-khmer' : ''}`}>
                    ✅ {isLanguageKh ? 'កូដត្រូវបានរក្សាទុក:' : 'Promo saved:'} {appliedPromo.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pricing Summary */}
        <div className="space-y-6">
          <Card className="sticky top-6 border-green-200">
            <CardHeader className="bg-green-50">
              <CardTitle className={`text-center ${isLanguageKh ? 'font-khmer' : ''}`}>
                {isLanguageKh ? 'សេចក្តីសង្ខេប试用' : 'Trial Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className={`text-gray-600 ${isLanguageKh ? 'font-khmer' : ''}`}>
                    {isLanguageKh ? 'កញ្ចប់មូលដ្ឋាន:' : 'Base package:'}
                  </span>
                  <div className="text-right">
                    <div className="line-through text-gray-400">${pricing.originalPrice}/mo</div>
                    <div className="text-green-600 font-bold">$0/mo</div>
                  </div>
                </div>
                
                {data.services && data.services.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className={`text-gray-600 ${isLanguageKh ? 'font-khmer' : ''}`}>
                        {isLanguageKh ? 'សេវាបន្ថែម:' : 'Add-ons:'}
                      </span>
                      <div className="text-right">
                        <div className="line-through text-gray-400">${pricing.addOnsPrice}/mo</div>
                        <div className="text-green-600 font-bold">$0/mo</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t pt-3">
                  <div className="flex justify-between font-medium">
                    <span className={isLanguageKh ? 'font-khmer' : ''}>
                      {isLanguageKh ? 'សរុបប្រចាំខែ:' : 'Monthly value:'}
                    </span>
                    <div className="text-right">
                      <div className="line-through text-gray-400">${pricing.originalPrice}/mo</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Savings during trial */}
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <div className="flex justify-between text-sm">
                  <span className={`text-green-700 ${isLanguageKh ? 'font-khmer' : ''}`}>
                    {isLanguageKh ? 'ការសន្សំក្នុងខែ试用:' : 'Trial month savings:'}
                  </span>
                  <span className="text-green-700 font-medium">
                    ${pricing.savings.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className={`text-lg font-bold text-gray-900 ${isLanguageKh ? 'font-khmer' : ''}`}>
                    {isLanguageKh ? 'តម្លៃ试用:' : 'Trial Price:'}
                  </span>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      $0
                    </div>
                    <div className={`text-sm text-gray-600 ${isLanguageKh ? 'font-khmer' : ''}`}>
                      /{isLanguageKh ? 'ខែ试用' : 'month trial'}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 text-center pt-2 border-t">
                <p className={isLanguageKh ? 'font-khmer' : ''}>
                  {isLanguageKh 
                    ? 'គ្មានការទូទាត់ គ្មានការបង់ប្រាក់'
                    : 'No payment, no credit card required'
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Benefits Card */}
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-4">
              <div className="space-y-3 text-xs text-gray-600">
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className={isLanguageKh ? 'font-khmer' : ''}>
                    {isLanguageKh ? '១ខែ试用ឥតគិតថ្លៃ' : '1 month free trial'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className={isLanguageKh ? 'font-khmer' : ''}>
                    {isLanguageKh ? 'គ្មានការទូទាត់' : 'No payment required'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className={isLanguageKh ? 'font-khmer' : ''}>
                    {isLanguageKh ? 'គ្មានកាតឥណទាន' : 'No credit card needed'}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className={isLanguageKh ? 'font-khmer' : ''}>
                    {isLanguageKh ? 'បោះបង់គ្រប់ពេល' : 'Cancel anytime'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PricingStep;