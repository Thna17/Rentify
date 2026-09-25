import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import {
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShoppingBag,
  Store,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useLoginForm } from '../hooks/useLoginForm';
import { useAuthConfig } from '../utils/authUtils';
import { useWebsiteData } from '@rentify/shared/context/WebsiteContext';
import { useAuthLanguage } from '../context/AuthLanguageContext';
import AuthLayout from '../components/AuthLayout';
import ContactInput from '../components/ContactInput';
import { Button } from '@rentify/shared/ui/button';
import { Alert, AlertDescription } from '@rentify/shared/ui/alert';
import { validateCambodianPhone } from '../utils/phoneUtils';
import { cn } from '@rentify/utils';

interface LoginFormData {
  contact: string;
  password: string;
  rememberMe?: boolean;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, isKhmer } = useAuthLanguage();
  const { isWebsiteTemplate, isMarketplace, isHostedStorefrontBuyer, returnDomain } = useAuthConfig();
  const { content } = useWebsiteData();

  const [showPassword, setShowPassword] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);

  const {
    error,
    success,
    loading,
    inputMode,
    setInputMode,
    handleLogin,
    handleTelegramLogin,
    telegramEnabled,
  } = useLoginForm();

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: {
      contact: '',
      password: '',
      rememberMe: true,
    },
  });

  // Restore remembered credentials from localStorage
  useEffect(() => {
    try {
      const savedRemember = localStorage.getItem('rentify_remember_me') === 'true';
      if (savedRemember) {
        setValue('rememberMe', true);
        const savedContact = localStorage.getItem('rentify_last_contact');
        const savedMode = localStorage.getItem('rentify_last_mode') as 'email' | 'phone' | null;
        if (savedContact) {
          setValue('contact', savedContact);
        }
        if (savedMode === 'email' || savedMode === 'phone') {
          setInputMode(savedMode);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [setValue, setInputMode]);

  // Trigger error shake animation when an error occurs
  useEffect(() => {
    if (error) {
      setShouldShake(true);
      const timer = setTimeout(() => setShouldShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const onSubmit = (data: LoginFormData) => {
    try {
      if (data.rememberMe) {
        localStorage.setItem('rentify_remember_me', 'true');
        localStorage.setItem('rentify_last_contact', data.contact);
        localStorage.setItem('rentify_last_mode', inputMode);
      } else {
        localStorage.removeItem('rentify_remember_me');
        localStorage.removeItem('rentify_last_contact');
        localStorage.removeItem('rentify_last_mode');
      }
    } catch {
      // Ignore localStorage errors
    }

    handleLogin({
      contact: data.contact,
      password: data.password,
    });
  };

  const onInvalid = () => {
    setShouldShake(true);
    const timer = setTimeout(() => setShouldShake(false), 500);
    return () => clearTimeout(timer);
  };

  const handleForgotPassword = () => {
    navigate({ pathname: '/forgot-password', search: location.search });
  };

  // Unverified accounts are sent to the verification page with their email.
  const needsVerification = /not verified/i.test(error || '');

  const handleVerify = () => {
    navigate({
      pathname: '/verify-email',
      search: `?email=${encodeURIComponent(getValues('contact'))}`,
    });
  };

  const handleSignUp = () => {
    navigate({ pathname: '/signup', search: location.search });
  };

  // Determine dynamic title and subtitle based on user origin
  const isStoreCustomer = isWebsiteTemplate || isHostedStorefrontBuyer;

  const fallbackStoreName = returnDomain
    ? returnDomain.split('.')[0].charAt(0).toUpperCase() + returnDomain.split('.')[0].slice(1)
    : 'Store';

  const storeName =
    content?.['Site Title'] ||
    content?.['Website Name'] ||
    content?.name ||
    fallbackStoreName;

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
        <span className={cn(isKhmer && 'font-khmer')}>Rentify Merchant</span>
      </div>
    );
  };

  const getPageTitle = () => {
    if (isStoreCustomer) {
      return t('login.title.customer', { storeName });
    }
    if (isMarketplace) {
      return t('login.title.marketplace');
    }
    return t('login.title.merchant');
  };

  const getPageSubtitle = () => {
    if (isStoreCustomer) {
      return t('login.subtitle.customer');
    }
    if (isMarketplace) {
      return t('login.subtitle.marketplace');
    }
    return t('login.subtitle.merchant');
  };

  return (
    <AuthLayout
      badge={getContextBadge()}
      title={getPageTitle()}
      subtitle={getPageSubtitle()}
    >
      <form
        onSubmit={handleSubmit(onSubmit, onInvalid)}
        className={cn('space-y-5 transition-transform duration-200', shouldShake && 'animate-shake')}
        noValidate
      >
        {/* Error Alert */}
        {error && (
          <Alert
            variant="destructive"
            className="flex items-start gap-3 rounded-2xl border-rose-200 bg-rose-50/90 text-rose-900 shadow-sm animate-in fade-in-50"
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600 mt-0.5" />
            <AlertDescription className={cn('flex flex-1 flex-wrap items-center justify-between gap-2 text-sm font-medium leading-relaxed', isKhmer && 'font-khmer')}>
              <span>{error}</span>
              {needsVerification && (
                <button
                  type="button"
                  onClick={handleVerify}
                  className="font-semibold text-rose-700 underline underline-offset-2 hover:text-rose-900"
                >
                  {t('login.verifyNow')}
                </button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert className="flex items-start gap-3 rounded-2xl border-emerald-200 bg-emerald-50 text-emerald-900 shadow-sm animate-in fade-in-50">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600 mt-0.5" />
            <AlertDescription className={cn('text-sm font-medium leading-relaxed', isKhmer && 'font-khmer')}>
              {success}
            </AlertDescription>
          </Alert>
        )}

        {/* Telegram sign-in: platform accounts only, shown when Core has a bot configured */}
        {telegramEnabled && (
          <>
            <Button
              type="button"
              onClick={handleTelegramLogin}
              disabled={loading}
              variant="outline"
              className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-all duration-200"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="12" r="12" fill="#229ED9" />
                <path
                  fill="#fff"
                  d="M5.4 11.8l11.6-4.5c.54-.2 1 .13.83.94l-2 9.3c-.14.66-.54.82-1.1.51l-3-2.2-1.45 1.4c-.16.16-.3.3-.6.3l.21-3.05 5.56-5.02c.24-.21-.05-.33-.38-.12l-6.87 4.33-2.96-.92c-.64-.2-.66-.64.14-.95z"
                />
              </svg>
              <span className={cn('text-sm font-semibold', isKhmer && 'font-khmer')}>
                {t('login.continueTelegram')}
              </span>
            </Button>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              <span className={cn(isKhmer && 'font-khmer')}>{t('login.orContinueWith')}</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>
          </>
        )}

        {/* Contact Input (Email or Cambodian Phone) */}
        <Controller
          name="contact"
          control={control}
          rules={{
            required: t('error.invalidContact'),
            validate: (value) => {
              const val = (value || '').trim();
              if (!val) return t('error.invalidContact');
              if (inputMode === 'email') {
                return (
                  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ||
                  t('error.invalidEmail')
                );
              }
              return (
                validateCambodianPhone(val) ||
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

        {/* Password Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className={cn(
                'text-xs font-semibold uppercase tracking-wider text-slate-700',
                isKhmer && 'text-sm font-medium tracking-normal font-khmer'
              )}
            >
              {t('auth.password')}
              <span className="ml-1 text-red-500">*</span>
            </label>

            <button
              type="button"
              onClick={handleForgotPassword}
              tabIndex={-1}
              className={cn(
                'text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors',
                isKhmer && 'font-khmer text-sm'
              )}
            >
              {t('login.forgotPassword')}
            </button>
          </div>

          <Controller
            name="password"
            control={control}
            rules={{
              required: t('error.passwordRequired'),
            }}
            render={({ field }) => (
              <div
                className={cn(
                  'relative flex h-12 w-full items-center rounded-xl border bg-white transition-all',
                  errors.password
                    ? 'border-red-400 ring-2 ring-red-100'
                    : 'border-slate-300 hover:border-slate-400 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/10',
                  loading && 'cursor-not-allowed bg-slate-50 opacity-60'
                )}
              >
                <div className="flex h-full items-center pl-3.5 pr-2 text-slate-400">
                  <KeyRound className="h-5 w-5" />
                </div>

                <input
                  {...field}
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  disabled={loading}
                  placeholder={t('auth.passwordPlaceholder')}
                  className={cn(
                    'h-full flex-1 bg-transparent px-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none',
                    isKhmer && 'font-khmer'
                  )}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="mr-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            )}
          />

          {errors.password && (
            <p className={cn('text-xs text-red-600 font-medium', isKhmer && 'font-khmer')}>
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Remember Me Checkbox */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <Controller
              name="rememberMe"
              control={control}
              render={({ field }) => (
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-colors"
                />
              )}
            />
            <span className={cn('text-xs text-slate-600', isKhmer && 'font-khmer text-sm')}>
              {t('login.rememberMe')}
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={loading}
          className="relative h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-semibold shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] transition-all duration-200 group disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className={isKhmer ? 'font-khmer' : ''}>{t('action.signingIn')}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span className={cn('font-semibold', isKhmer ? 'font-khmer text-base' : 'text-sm')}>
                {t('action.signIn')}
              </span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          )}
        </Button>

        {/* Create Account Link Footer */}
        <div className="pt-4 text-center border-t border-slate-100">
          <p className={cn('text-sm text-slate-600', isKhmer && 'font-khmer')}>
            {t('login.noAccount')}{' '}
            <button
              type="button"
              onClick={handleSignUp}
              className={cn(
                'font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors ml-1',
                isKhmer && 'font-khmer font-bold'
              )}
            >
              {t('login.createAccount')}
            </button>
          </p>
        </div>

        {/* Security Footnote */}
        <div className="flex items-center justify-center gap-1.5 pt-1 text-xs text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span className={cn('text-center font-medium', isKhmer && 'font-khmer')}>
            {t('login.securityFootnote')}
          </span>
        </div>
      </form>
    </AuthLayout>
  );
}

export default LoginPage;
