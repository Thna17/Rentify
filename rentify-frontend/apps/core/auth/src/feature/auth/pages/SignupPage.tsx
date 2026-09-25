import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import {
  User,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Circle,
  Check,
  ShieldCheck,
  Send,
  RotateCcw,
  Sparkles,
  ShoppingBag,
  Store,
} from 'lucide-react';
import { useSignupForm } from '../hooks/useSignupForm';
import { useAuthConfig } from '../utils/authUtils';
import { useWebsiteData } from '@rentify/shared/context/WebsiteContext';
import { useAuthLanguage } from '../context/AuthLanguageContext';
import AuthLayout from '../components/AuthLayout';
import ContactInput from '../components/ContactInput';
import { Button } from '@rentify/shared/ui/button';
import { Alert, AlertDescription } from '@rentify/shared/ui/alert';
import { validateCambodianPhone } from '../utils/phoneUtils';
import { cn } from '@rentify/utils';

interface SignupFormData {
  name: string;
  contact: string;
  password: string;
  confirmPassword: string;
  telegramOptIn?: boolean;
}

export function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, isKhmer } = useAuthLanguage();
  const { isWebsiteTemplate, isMarketplace, isHostedStorefrontBuyer, returnDomain } = useAuthConfig();
  const { content } = useWebsiteData();

  const [inputMode, setInputMode] = useState<'email' | 'phone'>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [shouldShake, setShouldShake] = useState(false);
  const [telegramOptIn, setTelegramOptIn] = useState(true);

  // OTP 6-cell state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState<number>(60);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const {
    step,
    setStep,
    email,
    phoneNumber,
    otp,
    error,
    success,
    loading,
    verificationMethod,
    setOtp,
    handleSignup,
    handleResendOtp,
    handleVerifyOtp,
    checkTelegramLink,
  } = useSignupForm();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignupFormData>({
    defaultValues: {
      name: '',
      contact: '',
      password: '',
      confirmPassword: '',
      telegramOptIn: true,
    },
  });

  const passwordValue = watch('password') || '';
  const confirmPasswordValue = watch('confirmPassword') || '';

  // Password criteria checkmarks
  const hasMinLength = passwordValue.length >= 8;
  const hasUppercase = /[A-Z]/.test(passwordValue);
  const hasNumber = /[0-9]/.test(passwordValue);
  const hasSymbolOrComplex =
    /[^A-Za-z0-9]/.test(passwordValue) ||
    (passwordValue.length >= 10 && hasUppercase && hasNumber && /[a-z]/.test(passwordValue));

  // Compute 4-bar strength score (0 to 4)
  const strengthScore = (() => {
    if (!passwordValue) return 0;
    let score = 0;
    if (hasMinLength) score += 1;
    if (hasUppercase) score += 1;
    if (hasNumber) score += 1;
    if (hasSymbolOrComplex) score += 1;
    // Cap at 2 if minimum length not met
    if (!hasMinLength) return Math.min(score, 1);
    return Math.max(score, 1);
  })();

  const getStrengthMeta = () => {
    switch (strengthScore) {
      case 1:
        return {
          label: t('signup.strength.weak'),
          textColor: 'text-rose-600',
          barColor: 'bg-rose-500',
        };
      case 2:
        return {
          label: t('signup.strength.fair'),
          textColor: 'text-amber-600',
          barColor: 'bg-amber-500',
        };
      case 3:
        return {
          label: t('signup.strength.good'),
          textColor: 'text-blue-600',
          barColor: 'bg-blue-500',
        };
      case 4:
        return {
          label: t('signup.strength.strong'),
          textColor: 'text-emerald-600',
          barColor: 'bg-emerald-500',
        };
      default:
        return {
          label: '',
          textColor: 'text-slate-400',
          barColor: 'bg-slate-200',
        };
    }
  };

  // Real-time password match checks
  const isConfirmFilled = confirmPasswordValue.length > 0;
  const isPasswordsMatch = isConfirmFilled && confirmPasswordValue === passwordValue;
  const isPasswordsMismatch = isConfirmFilled && confirmPasswordValue !== passwordValue;

  // Shake animation trigger on error
  useEffect(() => {
    if (error) {
      setShouldShake(true);
      const timer = setTimeout(() => setShouldShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Resend cooldown timer for OTP screen
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'verify' && resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [step, resendCooldown]);

  // Sync otpDigits with useSignupForm otp state
  const handleDigitChange = (index: number, val: string) => {
    const cleanDigit = val.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = cleanDigit;
    setOtpDigits(updated);
    const fullCode = updated.join('');
    setOtp(fullCode);

    // Auto advance focus
    if (cleanDigit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const updated = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      updated[i] = pasted[i];
    }
    setOtpDigits(updated);
    setOtp(pasted);
    const nextFocus = Math.min(pasted.length, 5);
    otpInputRefs.current[nextFocus]?.focus();
  };

  const onSubmit = (data: SignupFormData) => {
    handleSignup({
      name: data.name,
      contact: data.contact,
      password: data.password,
      inputMode,
    });
  };

  const onInvalid = () => {
    setShouldShake(true);
    const timer = setTimeout(() => setShouldShake(false), 500);
    return () => clearTimeout(timer);
  };

  // Derive contextual store branding
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
    if (step === 'link') {
      return isKhmer ? 'ភ្ជាប់គណនី Telegram' : 'Connect Telegram Account';
    }
    if (step === 'verify') {
      return t('verify.title');
    }
    if (isStoreCustomer) {
      return t('signup.title.customer');
    }
    if (isMarketplace) {
      return t('signup.title.marketplace');
    }
    return t('signup.title.merchant');
  };

  const getPageSubtitle = () => {
    if (step === 'link') {
      return isKhmer
        ? 'ភ្ជាប់ Telegram ដើម្បីទទួលលេខកូដសម្ងាត់ OTP ភ្លាមៗ'
        : 'Connect your Telegram to receive instant OTP verification codes';
    }
    if (step === 'verify') {
      const destination = verificationMethod === 'email' ? email : (phoneNumber || 'Telegram');
      return t('verify.subtitle', { destination });
    }
    if (isStoreCustomer) {
      return t('signup.subtitle.customer');
    }
    if (isMarketplace) {
      return t('signup.subtitle.marketplace');
    }
    return t('signup.subtitle.merchant');
  };

  return (
    <AuthLayout
      badge={getContextBadge()}
      title={getPageTitle()}
      subtitle={getPageSubtitle()}
    >
      {/* Steps Progress Indicator */}
      <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
        {/* Step 1: Account Details */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all',
              step === 'signup'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-emerald-100 text-emerald-700'
            )}
          >
            {step !== 'signup' ? <Check className="h-3.5 w-3.5" /> : '1'}
          </span>
          <span
            className={cn(
              'text-xs font-medium',
              step === 'signup' ? 'text-slate-900 font-semibold' : 'text-slate-500',
              isKhmer && 'font-khmer'
            )}
          >
            {isKhmer ? 'ព័ត៌មានគណនី' : 'Account Details'}
          </span>
        </div>

        {/* Optional Telegram Step Indicator */}
        {verificationMethod === 'telegram' && (
          <>
            <div className="h-0.5 flex-1 max-w-[32px] bg-slate-200 mx-2" />
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all',
                  step === 'link'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : step === 'verify'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-400'
                )}
              >
                {step === 'verify' ? <Check className="h-3.5 w-3.5" /> : '2'}
              </span>
              <span
                className={cn(
                  'text-xs font-medium',
                  step === 'link' ? 'text-slate-900 font-semibold' : 'text-slate-500',
                  isKhmer && 'font-khmer'
                )}
              >
                Telegram
              </span>
            </div>
          </>
        )}

        {/* Verification Step Indicator */}
        <div className="h-0.5 flex-1 max-w-[32px] bg-slate-200 mx-2" />
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all',
              step === 'verify'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-100 text-slate-400'
            )}
          >
            {verificationMethod === 'telegram' ? '3' : '2'}
          </span>
          <span
            className={cn(
              'text-xs font-medium',
              step === 'verify' ? 'text-slate-900 font-semibold' : 'text-slate-500',
              isKhmer && 'font-khmer'
            )}
          >
            {isKhmer ? 'ផ្ទៀងផ្ទាត់' : 'Verification'}
          </span>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <Alert
          variant="destructive"
          className="mb-5 flex items-start gap-3 rounded-2xl border-rose-200 bg-rose-50/90 text-rose-900 shadow-sm animate-in fade-in-50"
        >
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-600 mt-0.5" />
          <AlertDescription className={cn('text-sm font-medium leading-relaxed', isKhmer && 'font-khmer')}>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Global Success Banner */}
      {success && (
        <Alert className="mb-5 flex items-start gap-3 rounded-2xl border-emerald-200 bg-emerald-50 text-emerald-900 shadow-sm animate-in fade-in-50">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600 mt-0.5" />
          <AlertDescription className={cn('text-sm font-medium leading-relaxed', isKhmer && 'font-khmer')}>
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* STEP 1: Main Signup Form */}
      {step === 'signup' && (
        <form
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className={cn('space-y-4 transition-transform duration-200', shouldShake && 'animate-shake')}
          noValidate
        >
          {/* Full Name Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="signup-name"
              className={cn(
                'text-xs font-semibold uppercase tracking-wider text-slate-700',
                isKhmer && 'text-sm font-medium tracking-normal font-khmer'
              )}
            >
              {t('signup.label.name')}
              <span className="ml-1 text-red-500">*</span>
            </label>

            <Controller
              name="name"
              control={control}
              rules={{
                required: isKhmer ? 'សូមបញ្ចូលឈ្មោះពេញរបស់អ្នក' : 'Please enter your full name',
                minLength: {
                  value: 2,
                  message: isKhmer ? 'ឈ្មោះត្រូវមានយ៉ាងតិច ២ តួអក្សរ' : 'Name must be at least 2 characters',
                },
              }}
              render={({ field }) => (
                <div
                  className={cn(
                    'relative flex h-12 w-full items-center rounded-xl border bg-white transition-all',
                    errors.name
                      ? 'border-red-400 ring-2 ring-red-100'
                      : 'border-slate-300 hover:border-slate-400 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/10'
                  )}
                >
                  <div className="flex h-full items-center pl-3.5 pr-2 text-slate-400">
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    {...field}
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    disabled={loading}
                    placeholder={t('signup.placeholder.name')}
                    className={cn(
                      'h-full flex-1 bg-transparent px-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none',
                      isKhmer && 'font-khmer'
                    )}
                  />
                </div>
              )}
            />

            {errors.name && (
              <p className={cn('text-xs text-red-600 font-medium', isKhmer && 'font-khmer')}>
                {errors.name.message}
              </p>
            )}
          </div>

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
              />
            )}
          />

          {/* Password Field with Dynamic 4-Bar Strength & Checklist */}
          <div className="space-y-1.5">
            <label
              htmlFor="signup-password"
              className={cn(
                'text-xs font-semibold uppercase tracking-wider text-slate-700',
                isKhmer && 'text-sm font-medium tracking-normal font-khmer'
              )}
            >
              {t('auth.password')}
              <span className="ml-1 text-red-500">*</span>
            </label>

            <Controller
              name="password"
              control={control}
              rules={{
                required: t('error.passwordRequired'),
                minLength: {
                  value: 8,
                  message: isKhmer ? 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងតិច ៨ តួអក្សរ' : 'Password must be at least 8 characters',
                },
              }}
              render={({ field }) => (
                <div
                  className={cn(
                    'relative flex h-12 w-full items-center rounded-xl border bg-white transition-all',
                    errors.password
                      ? 'border-red-400 ring-2 ring-red-100'
                      : 'border-slate-300 hover:border-slate-400 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/10'
                  )}
                >
                  <div className="flex h-full items-center pl-3.5 pr-2 text-slate-400">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <input
                    {...field}
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
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
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}
            />

            {/* Dynamic 4-Bar Password Strength Indicator */}
            {passwordValue && (
              <div className="space-y-2 pt-1 animate-in fade-in-50">
                <div className="flex items-center justify-between text-xs">
                  <span className={cn('text-slate-500', isKhmer && 'font-khmer')}>
                    {t('signup.passwordStrength')}
                  </span>
                  <span className={cn('font-semibold', getStrengthMeta().textColor, isKhmer && 'font-khmer')}>
                    {getStrengthMeta().label}
                  </span>
                </div>

                {/* 4 Segmented Strength Bars */}
                <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                  {[1, 2, 3, 4].map((barIndex) => (
                    <div
                      key={barIndex}
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        strengthScore >= barIndex ? getStrengthMeta().barColor : 'bg-slate-100'
                      )}
                    />
                  ))}
                </div>

                {/* Helpful Criteria Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-1 text-xs">
                  <div
                    className={cn(
                      'flex items-center gap-1.5 transition-colors',
                      hasMinLength ? 'text-emerald-600 font-medium' : 'text-slate-400'
                    )}
                  >
                    {hasMinLength ? (
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
                    )}
                    <span className={cn(isKhmer && 'font-khmer')}>{t('signup.tip.length')}</span>
                  </div>

                  <div
                    className={cn(
                      'flex items-center gap-1.5 transition-colors',
                      hasUppercase ? 'text-emerald-600 font-medium' : 'text-slate-400'
                    )}
                  >
                    {hasUppercase ? (
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
                    )}
                    <span className={cn(isKhmer && 'font-khmer')}>{t('signup.tip.uppercase')}</span>
                  </div>

                  <div
                    className={cn(
                      'flex items-center gap-1.5 transition-colors',
                      hasNumber ? 'text-emerald-600 font-medium' : 'text-slate-400'
                    )}
                  >
                    {hasNumber ? (
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
                    )}
                    <span className={cn(isKhmer && 'font-khmer')}>{t('signup.tip.number')}</span>
                  </div>
                </div>
              </div>
            )}

            {errors.password && (
              <p className={cn('text-xs text-red-600 font-medium', isKhmer && 'font-khmer')}>
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Confirm Password Field with Real-Time Match Feedback */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="signup-confirm-password"
                className={cn(
                  'text-xs font-semibold uppercase tracking-wider text-slate-700',
                  isKhmer && 'text-sm font-medium tracking-normal font-khmer'
                )}
              >
                {t('signup.label.confirmPassword')}
                <span className="ml-1 text-red-500">*</span>
              </label>

              {/* Real-time match text */}
              {isPasswordsMatch && (
                <span className={cn('text-xs text-emerald-600 font-medium flex items-center gap-1', isKhmer && 'font-khmer')}>
                  <Check className="h-3.5 w-3.5" />
                  {t('signup.passwordMatchSuccess')}
                </span>
              )}
            </div>

            <Controller
              name="confirmPassword"
              control={control}
              rules={{
                required: isKhmer ? 'សូមបញ្ជាក់ពាក្យសម្ងាត់' : 'Please confirm your password',
                validate: (value) =>
                  value === passwordValue || t('error.passwordMatch'),
              }}
              render={({ field }) => (
                <div
                  className={cn(
                    'relative flex h-12 w-full items-center rounded-xl border bg-white transition-all',
                    isPasswordsMismatch || errors.confirmPassword
                      ? 'border-red-400 ring-2 ring-red-100'
                      : isPasswordsMatch
                      ? 'border-emerald-500 ring-2 ring-emerald-100'
                      : 'border-slate-300 hover:border-slate-400 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/10'
                  )}
                >
                  <div className="flex h-full items-center pl-3.5 pr-2 text-slate-400">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <input
                    {...field}
                    id="signup-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    disabled={loading}
                    placeholder={t('signup.placeholder.confirmPassword')}
                    className={cn(
                      'h-full flex-1 bg-transparent px-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none',
                      isKhmer && 'font-khmer'
                    )}
                  />

                  {/* Password Match Status Icon */}
                  {isPasswordsMatch && (
                    <div className="mr-1 text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="mr-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              )}
            />

            {errors.confirmPassword && (
              <p className={cn('text-xs text-red-600 font-medium', isKhmer && 'font-khmer')}>
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Cambodian Telegram Notifications Checkbox */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                id="telegram-opt-in"
                checked={telegramOptIn}
                onChange={(e) => setTelegramOptIn(e.target.checked)}
                className="h-4 w-4 mt-0.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 transition-colors"
              />
              <div className="flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5 text-sky-500 flex-shrink-0" />
                <span className={cn('text-xs text-slate-600', isKhmer && 'font-khmer text-sm')}>
                  {t('signup.telegramOptIn')}
                </span>
              </div>
            </label>
          </div>

          {/* Terms & Privacy Agreement with Links */}
          <div className="text-xs text-slate-500 leading-relaxed pt-1">
            <span className={cn(isKhmer && 'font-khmer')}>{t('signup.termsPrefix')}{' '}</span>
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className={cn('font-medium text-blue-600 hover:text-blue-700 hover:underline', isKhmer && 'font-khmer')}
            >
              {t('signup.termsOfService')}
            </a>
            <span className={cn(isKhmer && 'font-khmer')}>{' '}{t('signup.and')}{' '}</span>
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className={cn('font-medium text-blue-600 hover:text-blue-700 hover:underline', isKhmer && 'font-khmer')}
            >
              {t('signup.privacyPolicy')}
            </a>
            <span>.</span>
          </div>

          {/* Primary Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className="relative h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-semibold shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] transition-all duration-200 group disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className={isKhmer ? 'font-khmer' : ''}>{t('action.signingUp')}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span className={cn('font-semibold', isKhmer ? 'font-khmer text-base' : 'text-sm')}>
                  {t('action.signUp')}
                </span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            )}
          </Button>

          {/* Already have an account link */}
          <div className="pt-4 text-center border-t border-slate-100">
            <p className={cn('text-sm text-slate-600', isKhmer && 'font-khmer')}>
              {t('signup.hasAccount')}{' '}
              <button
                type="button"
                onClick={() => navigate({ pathname: '/login', search: location.search })}
                className={cn(
                  'font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors ml-1',
                  isKhmer && 'font-khmer font-bold'
                )}
              >
                {t('action.signIn')}
              </button>
            </p>
          </div>
        </form>
      )}

      {/* STEP 2: Telegram Bot Link Guide (For Cambodian Phone Numbers) */}
      {step === 'link' && (
        <div className="space-y-5 animate-in fade-in-50">
          <button
            type="button"
            onClick={() => setStep('signup')}
            className={cn('inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors', isKhmer && 'font-khmer text-sm')}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {isKhmer ? 'ត្រឡប់ក្រោយ' : 'Back to details'}
          </button>

          {/* Telegram Info Box */}
          <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#229ED9] text-white shadow-md shadow-sky-500/20">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h4 className={cn('text-sm font-bold text-slate-900', isKhmer && 'font-khmer')}>
                  {isKhmer ? 'ភ្ជាប់តាម Telegram Bot ផ្លូវការ' : 'Connect via Official Telegram Bot'}
                </h4>
                <p className={cn('text-xs text-slate-600', isKhmer && 'font-khmer')}>
                  {isKhmer ? 'ឥតគិតថ្លៃ និងផ្ញើលេខកូដសម្ងាត់លឿនបំផុត' : 'Instant, 100% free delivery for Cambodian numbers'}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 text-xs text-slate-700 border-t border-sky-100">
              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-sky-200 text-sky-800 font-bold text-[11px]">
                  1
                </span>
                <p className={isKhmer ? 'font-khmer leading-relaxed' : 'leading-relaxed'}>
                  {isKhmer
                    ? 'ចុចប៊ូតុងខាងក្រោមដើម្បីបើក @rentify_customer_bot'
                    : 'Click button below to open @rentify_customer_bot'}
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-sky-200 text-sky-800 font-bold text-[11px]">
                  2
                </span>
                <p className={isKhmer ? 'font-khmer leading-relaxed' : 'leading-relaxed'}>
                  {isKhmer ? 'ចុចប៊ូតុង "Start" ក្នុង Telegram' : 'Press "Start" in the Telegram chat'}
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-sky-200 text-sky-800 font-bold text-[11px]">
                  3
                </span>
                <p className={isKhmer ? 'font-khmer leading-relaxed' : 'leading-relaxed'}>
                  {isKhmer
                    ? 'ចុច "Share Contact" (ចែករំលែកលេខទូរស័ព្ទ) នៅពេល Bot ស្នើសុំ'
                    : 'Tap "Share Contact" when prompted by the bot'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <Button
              type="button"
              onClick={() => window.open('https://t.me/rentify_customer_bot', '_blank')}
              className="h-12 w-full rounded-xl bg-[#229ED9] hover:bg-[#1E8CC0] text-white font-semibold shadow-md shadow-sky-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" />
              <span className={isKhmer ? 'font-khmer text-base' : 'text-sm'}>
                {isKhmer ? 'បើក Telegram Bot ឥឡូវនេះ' : 'Open Telegram Bot Now'}
              </span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={checkTelegramLink}
              disabled={loading}
              className="h-12 w-full rounded-xl border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className={isKhmer ? 'font-khmer' : ''}>
                    {isKhmer ? 'កំពុងពិនិត្យ...' : 'Checking connection...'}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className={isKhmer ? 'font-khmer text-base' : 'text-sm'}>
                    {isKhmer ? 'ខ្ញុំបានភ្ជាប់រួចរាល់ហើយ' : "I've Linked My Telegram"}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: 6-Digit OTP Verification Screen */}
      {step === 'verify' && (
        <div className="space-y-6 animate-in fade-in-50">
          <button
            type="button"
            onClick={() => setStep(verificationMethod === 'telegram' ? 'link' : 'signup')}
            className={cn('inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors', isKhmer && 'font-khmer text-sm')}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {isKhmer ? 'ត្រឡប់ក្រោយ' : 'Back'}
          </button>

          {/* 6-Digit Individual Cell Input */}
          <div className="space-y-3">
            <label
              className={cn(
                'text-xs font-semibold uppercase tracking-wider text-slate-700 text-center block',
                isKhmer && 'text-sm font-medium tracking-normal font-khmer'
              )}
            >
              {t('verify.title')}
            </label>

            <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handleDigitPaste}>
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpInputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                  autoFocus={idx === 0}
                  className={cn(
                    'h-13 w-11 sm:h-14 sm:w-12 rounded-xl border-2 text-center font-mono text-xl sm:text-2xl font-bold transition-all focus:outline-none focus:ring-4',
                    digit
                      ? 'border-blue-600 bg-blue-50/30 text-slate-900 focus:ring-blue-500/20'
                      : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 focus:border-blue-600 focus:ring-blue-500/10'
                  )}
                />
              ))}
            </div>
          </div>

          {/* Submit Verify Button */}
          <Button
            type="button"
            onClick={handleVerifyOtp}
            disabled={loading || otp.length !== 6}
            className="relative h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-semibold shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className={isKhmer ? 'font-khmer' : ''}>{t('action.verifying')}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span className={cn('font-semibold', isKhmer ? 'font-khmer text-base' : 'text-sm')}>
                  {t('action.verify')}
                </span>
              </div>
            )}
          </Button>

          {/* Resend Code Section with Cooldown */}
          <div className="pt-2 text-center">
            <p className={cn('text-xs text-slate-500 mb-1.5', isKhmer && 'font-khmer')}>
              {t('verify.didNotReceive')}
            </p>
            {resendCooldown > 0 ? (
              <span className={cn('text-xs font-medium text-slate-400', isKhmer && 'font-khmer')}>
                {t('verify.resendIn', { seconds: resendCooldown })}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setResendCooldown(60);
                  handleResendOtp();
                }}
                disabled={loading}
                className={cn(
                  'inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors',
                  isKhmer && 'font-khmer text-sm'
                )}
              >
                <RotateCcw className="h-3 w-3" />
                {t('action.resendCode')}
              </button>
            )}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}

export default SignupPage;
