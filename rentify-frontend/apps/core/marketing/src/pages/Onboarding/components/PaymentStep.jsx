import React, { useState } from 'react';
import { Button } from "@rentify/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@rentify/shared/ui/card";
import { Badge } from "@rentify/shared/ui/badge";
import { CreditCard, Smartphone, Shield, Lock, Check, ArrowRight } from 'lucide-react';
import KHQRPayment from './KHQRPayment';
import { addOns } from '../addOnsData';
import { useLanguage } from '../../../contexts/LanguageContext';
const PaymentStep = ({ data, onUpdate, onNext }) => {
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showKHQR, setShowKHQR] = useState(false);
  const { language, t } = useLanguage();
  const isLanguageKh = language === 'KH';

  const paymentMethods = [
    {
      id: 'khqr',
      name: 'KHQR',
      nameKh: 'KHQR',
      description: 'Fast and secure payment with KHQR',
      descriptionKh: 'ការទូទាត់រហ័ស និងមានសុវត្ថិភាពជាមួយ KHQR',
      icon: Smartphone,
      recommended: true,
      badges: ['ណែនាំ', 'Recommended'],
      benefits: [
        'Instant payment confirmation',
        'No credit card required',
        'Supports all major Cambodian banks',
        'QR code scanning',
      ],
      benefitsKh: [
        'ការបញ្ជាក់ការទូទាត់ភ្លាមៗ',
        'មិនត្រូវការកាតឥណទាន',
        'គាំទ្រធនាគារកម្ពុជាធំៗទាំងអស់',
        'ស្កែន QR code',
      ],
    },
    {
      id: 'stripe',
      name: 'Credit/Debit Card',
      nameKh: 'កាតឥណទាន/ឌេប៊ីត',
      description: 'Pay with Visa, Mastercard, or other cards',
      descriptionKh: 'ទូទាត់ជាមួយ Visa, Mastercard, ឬកាតផ្សេងទៀត',
      icon: CreditCard,
      recommended: false,
      badges: [],
      benefits: [
        'International cards accepted',
        'Secure payment processing',
        'Automatic billing',
        'Payment history tracking',
      ],
      benefitsKh: [
        'ទទួលយកកាតអន្តរជាតិ',
        'ដំណើរការទូទាត់មានសុវត្ថិភាព',
        'ការកាត់វិក្កយបត្រស្វ័យប្រវត្តិ',
        'តាមដានប្រវត្តិការទូទាត់',
      ],
    },
  ];

  const handlePaymentSelect = (paymentMethod) => {
    setSelectedPayment(paymentMethod);
    onUpdate({
      payment: {
        method: paymentMethod.id,
        details: paymentMethod,
      },
    });
        if (paymentMethod.id === 'khqr') {
      setShowKHQR(true);
    }
  };

  const handlePayment = async () => {
    if (selectedPayment?.id === 'khqr') {
      setShowKHQR(true);
      return;
    }

    setIsProcessing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      onUpdate({
        payment: {
          ...data.payment,
          status: 'completed',
          transactionId: 'TXN_' + Date.now(),
        },
      });
      onNext();
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

    const handleBackFromKHQR = () => {
    setShowKHQR(false);
    setSelectedPayment(null);
  };

  

  const calculateTotal = () => {
    const pricing = data.pricing || {};
    return pricing.finalTotal || pricing.totalPrice || 0;
  };

  
   if (showKHQR) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <KHQRPayment
            data={data}
            onUpdate={onUpdate}
            onNext={onNext}
            onBack={handleBackFromKHQR}
            isLanguageKh={isLanguageKh}
            amount={calculateTotal()}
          />
        </div>
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className={`text-center ${isLanguageKh ? 'font-khmer' : ''}`}>
                {isLanguageKh ? 'សេចក្តីសង្ខេបការបញ្ជាទិញ' : 'Order Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.package && (
                <div className="flex justify-between items-center">
                  <div>
                    <span className={`font-medium text-gray-900 ${isLanguageKh ? 'font-khmer' : ''}`}>
                      {isLanguageKh ? data.package.nameKh : data.package.name}
                    </span>
                    <p className={`text-xs text-gray-600 ${isLanguageKh ? 'font-khmer' : ''}`}>
                      {isLanguageKh ? 'កញ្ចប់' : 'Package'}
                    </p>
                  </div>
                  <span className="font-medium">${data.package.price}/mo</span>
                </div>
              )}
              {data.services && data.services.length > 0 && (
                <div className="border-t pt-3">
                  <div className={`text-sm font-medium text-gray-700 mb-2 ${isLanguageKh ? 'font-khmer' : ''}`}>
                    {isLanguageKh ? 'សេវាកម្មបន្ថែម:' : 'Add-on Services:'}
                  </div>
                  {data.services.map((service) => {
                    const serviceId = typeof service === 'string' ? service : service.id;
                    const addOn = addOns.find((a) => a.id === serviceId);
                    const quantity = data.quantities?.[serviceId] || 1;
                    if (!addOn) return null;
                    return (
                      <div key={serviceId} className="flex justify-between text-sm text-gray-600">
                        <span className={isLanguageKh ? 'font-khmer' : ''}>
                          {isLanguageKh ? addOn.nameKh : addOn.name} {quantity > 1 && `(x${quantity})`}
                        </span>
                        <span>${(addOn.price * quantity).toFixed(2)}/mo</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className={`text-lg font-bold text-gray-900 ${isLanguageKh ? 'font-khmer' : ''}`}>
                    {isLanguageKh ? 'សរុប:' : 'Total:'}
                  </span>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">${calculateTotal().toFixed(2)}</div>
                    <div className={`text-sm text-gray-600 ${isLanguageKh ? 'font-khmer' : ''}`}>
                      {data.pricing?.billingPeriod === 'annual'
                        ? isLanguageKh
                          ? '/ឆ្នាំ'
                          : '/year'
                        : isLanguageKh
                          ? '/ខែ'
                          : '/month'}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <h2 className={`text-3xl font-bold text-gray-900 mb-4 ${isLanguageKh ? 'font-khmer' : ''}`}>
          {isLanguageKh ? 'ជ្រើសរើសវិធីទូទាត់' : 'Choose Payment Method'}
        </h2>
        <p className={`text-lg text-gray-600 max-w-3xl mx-auto ${isLanguageKh ? 'font-khmer' : ''}`}>
          {isLanguageKh
            ? 'ជ្រើសរើសវិធីទូទាត់ដែលងាយស្រួលបំផុតសម្រាប់អ្នក។ ការទូទាត់របស់អ្នកមានសុវត្ថិភាព និងកុំអុីល័យ។'
            : "Choose the payment method that's most convenient for you. Your payment is secure and encrypted."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedPayment?.id === method.id;
            return (
              <Card
                key={method.id}
                className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                  isSelected ? 'ring-2 ring-blue-500 shadow-lg bg-blue-50' : 'hover:shadow-md'
                } ${method.recommended ? 'border-2 border-green-500' : ''}`}
                onClick={() => handlePaymentSelect(method)}
              >
                {method.recommended && (
                  <div className="absolute -top-2 left-4">
                    <Badge className="bg-green-500 text-white px-3 py-1">
                      {isLanguageKh ? 'ណែនាំ' : 'Recommended'}
                    </Badge>
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div
                      className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Icon className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className={`text-xl font-bold text-gray-900 ${isLanguageKh ? 'font-khmer' : ''}`}>
                          {isLanguageKh ? method.nameKh : method.name}
                        </h3>
                        {isSelected && (
                          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                      <p className={`text-gray-600 mb-4 ${isLanguageKh ? 'font-khmer' : ''}`}>
                        {isLanguageKh ? method.descriptionKh : method.description}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(isLanguageKh ? method.benefitsKh : method.benefits).map((benefit, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className={`text-sm text-gray-700 ${isLanguageKh ? 'font-khmer' : ''}`}>
                              {benefit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className={`font-semibold text-green-900 mb-2 ${isLanguageKh ? 'font-khmer' : ''}`}>
                    {isLanguageKh ? 'ការទូទាត់មានសុវត្ថិភាព' : 'Secure Payment'}
                  </h3>
                  <p className={`text-green-800 text-sm ${isLanguageKh ? 'font-khmer' : ''}`}>
                    {isLanguageKh
                      ? 'ព័ត៌មានការទូទាត់របស់អ្នកត្រូវបានគ្រាបត្រសុវត្ថិភាព និងមិនត្រូវបានរក្សាទុកនៅលើម៉ាស៊ីនបម្រើរបស់យើងទេ។'
                      : 'Your payment information is encrypted and never stored on our servers.'}
                  </p>
                  <div className="flex items-center space-x-4 mt-3">
                    <div className="flex items-center space-x-1">
                      <Lock className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-700">SSL Encrypted</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Shield className="w-4 h-4 text-green-600" />
                      <span className="text-xs text-green-700">PCI Compliant</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className={`text-center ${isLanguageKh ? 'font-khmer' : ''}`}>
                {isLanguageKh ? 'សេចក្តីសង្ខេបការបញ្ជាទិញ' : 'Order Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.package && (
                <div className="flex justify-between items-center">
                  <div>
                    <span className={`font-medium text-gray-900 ${isLanguageKh ? 'font-khmer' : ''}`}>
                      {isLanguageKh ? data.package.nameKh : data.package.name}
                    </span>
                    <p className={`text-xs text-gray-600 ${isLanguageKh ? 'font-khmer' : ''}`}>
                      {isLanguageKh ? 'កញ្ចប់' : 'Package'}
                    </p>
                  </div>
                  <span className="font-medium">${data.package.price}/mo</span>
                </div>
              )}
              {data.services && data.services.length > 0 && (
                <div className="border-t pt-3">
                  <div className={`text-sm font-medium text-gray-700 mb-2 ${isLanguageKh ? 'font-khmer' : ''}`}>
                    {isLanguageKh ? 'សេវាកម្មបន្ថែម:' : 'Add-on Services:'}
                  </div>
                  {data.services.map((service) => {
                    const serviceId = typeof service === 'string' ? service : service.id;
                    const addOn = addOns.find((a) => a.id === serviceId);
                    const quantity = data.quantities?.[serviceId] || 1;
                    if (!addOn) return null;
                    return (
                      <div key={serviceId} className="flex justify-between text-sm text-gray-600">
                        <span className={isLanguageKh ? 'font-khmer' : ''}>
                          {isLanguageKh ? addOn.nameKh : addOn.name} {quantity > 1 && `(x${quantity})`}
                        </span>
                        <span>${(addOn.price * quantity).toFixed(2)}/mo</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {data.pricing?.billingPeriod && (
                <div className="border-t pt-3">
                  <div className="flex justify-between text-sm">
                    <span className={`text-gray-600 ${isLanguageKh ? 'font-khmer' : ''}`}>
                      {isLanguageKh ? 'រយៈពេលទូទាត់:' : 'Billing:'}
                    </span>
                    <span className={`font-medium ${isLanguageKh ? 'font-khmer' : ''}`}>
                      {data.pricing.billingPeriod === 'annual'
                        ? isLanguageKh
                          ? 'ប្រចាំឆ្នាំ'
                          : 'Annual'
                        : isLanguageKh
                          ? 'ប្រចាំខែ'
                          : 'Monthly'}
                    </span>
                  </div>
                </div>
              )}
              {data.pricing?.savings > 0 && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="flex justify-between text-sm">
                    <span className={`text-green-700 ${isLanguageKh ? 'font-khmer' : ''}`}>
                      {isLanguageKh ? 'ការសន្សំ:' : 'Annual savings:'}
                    </span>
                    <span className="text-green-700 font-medium">-${data.pricing.savings.toFixed(2)}</span>
                  </div>
                </div>
              )}
              {data.pricing?.promoDiscount > 0 && (
                <div className="bg-pink-50 p-3 rounded-lg border border-pink-200">
                  <div className="flex justify-between text-sm">
                    <span className={`text-pink-700 ${isLanguageKh ? 'font-khmer' : ''}`}>
                      {isLanguageKh ? 'ការបញ្ចុះតម្លៃ:' : 'Promo discount:'}
                    </span>
                    <span className="text-pink-700 font-medium">-${data.pricing.promoDiscount.toFixed(2)}</span>
                  </div>
                </div>
              )}
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className={`text-lg font-bold text-gray-900 ${isLanguageKh ? 'font-khmer' : ''}`}>
                    {isLanguageKh ? 'សរុប:' : 'Total:'}
                  </span>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">${calculateTotal().toFixed(2)}</div>
                    <div className={`text-sm text-gray-600 ${isLanguageKh ? 'font-khmer' : ''}`}>
                      {data.pricing?.billingPeriod === 'annual'
                        ? isLanguageKh
                          ? '/ឆ្នាំ'
                          : '/year'
                        : isLanguageKh
                          ? '/ខែ'
                          : '/month'}
                    </div>
                  </div>
                </div>
              </div>
              <Button
                onClick={handlePayment}
                disabled={!selectedPayment || isProcessing}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
                size="lg"
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className={isLanguageKh ? 'font-khmer' : ''}>
                      {isLanguageKh ? 'កំពុងដំណើរការ...' : 'Processing...'}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4" />
                    <span className={isLanguageKh ? 'font-khmer' : ''}>
                      {selectedPayment?.id === 'khqr' 
                        ? (isLanguageKh ? 'បន្តជាមួយ KHQR' : 'Continue with KHQR')
                        : (isLanguageKh ? 'ទូទាត់ឥឡូវ' : 'Pay Now')
                      }
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </Button>
              <div className="text-xs text-gray-500 text-center space-y-1">
                <p className={isLanguageKh ? 'font-khmer' : ''}>
                  {isLanguageKh ? 'ការធានាសងប្រាក់វិញ 30 ថ្ងៃ' : '30-day money-back guarantee'}
                </p>
                <p className={isLanguageKh ? 'font-khmer' : ''}>
                  {isLanguageKh ? 'បោះបង់គ្រប់ពេល • មិនមានកិច្ចសន្យាវែង' : 'Cancel anytime • No long-term contracts'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PaymentStep;