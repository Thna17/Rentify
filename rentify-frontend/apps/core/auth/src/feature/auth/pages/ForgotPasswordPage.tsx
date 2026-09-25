import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Mail,
  Smartphone,
  RotateCw,
  ShoppingBag,
  Store,
  Sparkles,
} from 'lucide-react';
import { useForgotPassword } from '../hooks/useForgotPassword';
import { useAuthLanguage } from '../context/AuthLanguageContext';
import { useAuthConfig } from '../utils/authUtils';
import { useWebsiteData } from '@rentify/shared/context/WebsiteContext';
import AuthLayout from '../components/AuthLayout';
import ContactInput from '../components/ContactInput';
import { Button } from '@rentify/shared/ui/button';
import { Alert, AlertDescription } from '@rentify/shared/ui/alert';
import { validateCambodianPhone, maskContact } from '../utils/phoneUtils';
import { cn } from '@rentify/utils';

interface ForgotPasswordFormData {
  contact: string;
}

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, isKhmer } = useAuthLanguage();
  const [inputMode, setInputMode] = useState<'email' | 'phone'>('email');
  const [submittedContact, setSubmittedContact] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(60);

  const {
    isWebsiteTemplate,
    isMarketplace,
    isHostedStorefrontBuyer,
    returnDomain,
  } = useAuthConfig();

  const { content } = useWebsiteData();
  const rawStoreName =
    content?.['Site Title'] ||
    content?.['Website Name'] ||
    content?.name ||
    (returnDomain ? returnDomain.split('.')[0] : '');

  const storeName = rawStoreName
    ? rawStoreName.charAt(0).toUpperCase() + rawStoreName.slice(1)
    : '';

  const isStoreCustomer = isWebsiteTemplate || isHostedStorefrontBuyer;

  const {
    error,
    success,
    loading,
    resetStatus,
    handleRequestReset,
  } = useForgotPassword();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    defaultValues: {
      contact: '',
    },
  });

  // Countdown timer for resending code
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (submittedContact && resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [submittedContact, resendCountdown]);

  const onSubmit = async (data: ForgotPasswordFormData) => {
    const ok = await handleRequestReset(data.contact);
    if (ok) {
      setSubmittedContact(data.contact.trim());
      setResendCountdown(60);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0 || !submittedContact || loading) return;
    const ok = await handleRequestReset(submittedContact);
    if (ok) {
      setResendCountdown(60);
    }
  };

  const handleProceedToReset = () => {
    navigate(
      {
        pathname: '/reset-password',
        search: location.search,
      },
      {
        state: {
          contactMethod: inputMode,
          contact: submittedContact,
        },
      }
    );
  };

  const handleTryAnother = () => {
    setSubmittedContact(null);
    resetStatus();
  };

  // Render contextual badge based on caller origin
  const renderBadge = () => {
    if (isStoreCustomer) {
      return (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
          <ShoppingBag className="h-3.5 w-3.5" />
          <span>{storeName ? `${storeName} Store` : 'Store Customer'}</span>
        </div>
      );
    }
    if (isMarketplace) {
      return (
        <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-700">
          <Store className="h-3.5 w-3.5" />
          <span>Rentify Marketplace</span>
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-700">
        <Sparkles className="h-3.5 w-3.5" />
        <span>Rentify Merchant</span>
      </div>
    );
  };

  return (
    <AuthLayout
      title={submittedContact ? undefined : t('forgot.title')}
      subtitle={submittedContact ? undefined : t('forgot.subtitle')}
      badge={renderBadge()}
    >
      {submittedContact ? (
        /* Confirmation Card State */
        <div className="space-y-6 text-center animate-in fade-in-50 zoom-in-95 duration-200">
          {/* Icon Badge */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500/10 via-indigo-500/15 to-blue-600/10 border border-blue-500/20 text-blue-600 shadow-sm">
            {inputMode === 'email' ? (
              <Mail className="h-8 w-8" />
            ) : (
              <Smartphone className="h-8 w-8" />
            )}
          </div>

          {/* Heading & Masked Contact */}
          <div className="space-y-2">
            <h2 className={cn('text-xl font-bold tracking-tight text-slate-900', isKhmer && 'font-khmer text-2xl')}>
              {inputMode === 'email'
                ? t('forgot.successTitleEmail')
                : t('forgot.successTitlePhone')}
            </h2>
            <p className={cn('text-sm text-slate-600 leading-relaxed max-w-sm mx-auto', isKhmer && 'font-khmer')}>
              {t('forgot.successSubtitle', { contact: maskContact(submittedContact) })}
            </p>
          </div>

          {/* Resend status or error feedback */}
          {error && (
            <Alert
              variant="destructive"
              className="flex items-start gap-3 rounded-2xl border-rose-200 bg-rose-50/90 text-rose-900 shadow-sm text-left"
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600 mt-0.5" />
              <AlertDescription className={cn('text-sm font-medium', isKhmer && 'font-khmer')}>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Action CTAs */}
          <div className="space-y-3 pt-2">
            <Button
              type="button"
              onClick={handleProceedToReset}
              className="relative h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-semibold shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] transition-all group"
            >
              <div className="flex items-center justify-center gap-2">
                <span className={isKhmer ? 'font-khmer text-base' : 'text-sm'}>
                  {t('forgot.enterCode')}
                </span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Button>

            {/* Resend button */}
            <div className="flex items-center justify-center gap-2 pt-1 text-xs text-slate-500">
              {resendCountdown > 0 ? (
                <span className={isKhmer ? 'font-khmer' : ''}>
                  {isKhmer
                    ? `អាចផ្ញើលេខកូដម្តងទៀតក្នុងរយៈពេល ${resendCountdown}វិនាទី`
                    : `Resend code in ${resendCountdown}s`}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className={cn(
                    'inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-700 transition-colors',
                    isKhmer && 'font-khmer'
                  )}
                >
                  <RotateCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                  {t('forgot.resendCode')}
                </button>
              )}
            </div>

            {/* Change Contact Link */}
            <button
              type="button"
              onClick={handleTryAnother}
              className={cn(
                'text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors pt-2 block mx-auto',
                isKhmer && 'font-khmer'
              )}
            >
              {t('forgot.tryAnother')}
            </button>
          </div>

          {/* Back to Login */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate({ pathname: '/login', search: location.search })}
              className={cn(
                'inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors',
                isKhmer && 'font-khmer text-sm'
              )}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('nav.backToLogin')}
            </button>
          </div>
        </div>
      ) : (
        /* Form Request State */
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Error Alert */}
          {error && (
            <Alert
              variant="destructive"
              className="flex items-start gap-3 rounded-2xl border-rose-200 bg-rose-50/90 text-rose-900 shadow-sm animate-in fade-in-50"
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600 mt-0.5" />
              <AlertDescription className={cn('text-sm font-medium leading-relaxed', isKhmer && 'font-khmer')}>
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Contact Input with Smart Operator Detection */}
          <Controller
            name="contact"
            control={control}
            rules={{
              required: t('error.invalidContact'),
              validate: (value) => {
                if (inputMode === 'email') {
                  return (
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || '').trim()) ||
                    t('error.invalidEmail')
                  );
                }
                return (
                  validateCambodianPhone(value || '') ||
                  t('error.invalidPhone')
                );
              },
            }}
            render={({ field }) => (
              <ContactInput
                mode={inputMode}
                onModeChange={(newMode) => {
                  setInputMode(newMode);
                  setValue('contact', '');
                }}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.contact?.message}
                disabled={loading}
                autoFocus
              />
            )}
          />

          {/* Instruction note */}
          <div className="flex items-center gap-2 px-1">
            <KeyRound className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <p className={cn('text-xs text-slate-500 leading-relaxed', isKhmer && 'font-khmer')}>
              {t('forgot.instruction')}
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className="relative h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-semibold shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] transition-all duration-200 group"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className={isKhmer ? 'font-khmer' : ''}>{t('action.sendingCode')}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span className={isKhmer ? 'font-khmer text-base' : 'text-sm'}>
                  {t('action.sendRecoveryCode')}
                </span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            )}
          </Button>

          {/* Back to Login Link */}
          <div className="pt-4 text-center border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate({ pathname: '/login', search: location.search })}
              className={cn(
                'inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors',
                isKhmer && 'font-khmer text-sm'
              )}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('nav.backToLogin')}
            </button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
