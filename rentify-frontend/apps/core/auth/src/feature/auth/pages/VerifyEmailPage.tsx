import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthLanguage } from '../context/AuthLanguageContext';
import { useAuthConfig } from '../utils/authUtils';
import { useWebsiteData } from '@rentify/shared/context/WebsiteContext';
import AuthLayout from '../components/AuthLayout';
import VerifyOtpForm from '../components/VerifyOtpForm';
import { maskContact } from '../utils/phoneUtils';
import { ShoppingBag, Store, Sparkles } from 'lucide-react';
import { cn } from '@rentify/utils';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const { t, isKhmer } = useAuthLanguage();
  const { isWebsiteTemplate, isMarketplace, isHostedStorefrontBuyer, returnDomain } = useAuthConfig();
  const { content } = useWebsiteData();

  const isStoreCustomer = isWebsiteTemplate || isHostedStorefrontBuyer;

  const fallbackStoreName = returnDomain
    ? returnDomain.split('.')[0].charAt(0).toUpperCase() + returnDomain.split('.')[0].slice(1)
    : 'Store';

  const storeName =
    content?.['Site Title'] ||
    content?.['Website Name'] ||
    content?.name ||
    fallbackStoreName;

  const emailParam = searchParams.get('email');
  const phoneParam = searchParams.get('phone') || searchParams.get('phoneNumber');
  const rawDestination = phoneParam || emailParam || '';
  const maskedDestination = rawDestination ? maskContact(rawDestination) : '';

  const getContextBadge = () => {
    if (isStoreCustomer) {
      return (
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/80 shadow-sm">
          <ShoppingBag className="h-3.5 w-3.5 text-emerald-600" />
          <span className={cn('truncate max-w-[220px]', isKhmer && 'font-khmer')}>
            {storeName}
          </span>
        </div>
      );
    }
    if (isMarketplace) {
      return (
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200/80 shadow-sm">
          <Store className="h-3.5 w-3.5 text-blue-600" />
          <span className={cn(isKhmer && 'font-khmer')}>Rentify Marketplace</span>
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200/80 shadow-sm">
        <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
        <span className={cn(isKhmer && 'font-khmer')}>Rentify</span>
      </div>
    );
  };

  return (
    <AuthLayout
      badge={getContextBadge()}
      title={t('verify.title')}
      subtitle={
        maskedDestination
          ? t('verify.subtitle', { destination: maskedDestination })
          : isKhmer
          ? 'សូមបញ្ចូលលេខកូដសម្ងាត់ ៦ ខ្ទង់ដើម្បីបញ្ចប់ការផ្ទៀងផ្ទាត់'
          : 'Enter the 6-digit security code to complete verification'
      }
    >
      <VerifyOtpForm />
    </AuthLayout>
  );
}