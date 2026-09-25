import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import {
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ShoppingBag,
  Store,
  Sparkles,
  RotateCw,
} from 'lucide-react';
import { useResetPassword } from '../hooks/useResetPassword';
import { useAuthLanguage } from '../context/AuthLanguageContext';
import { useAuthConfig } from '../utils/authUtils';
import { useWebsiteData } from '@rentify/shared/context/WebsiteContext';
import AuthLayout from '../components/AuthLayout';
import { Button } from '@rentify/shared/ui/button';
import { Alert, AlertDescription } from '@rentify/shared/ui/alert';
import { maskContact } from '../utils/phoneUtils';
import { cn } from '@rentify/utils';

interface ResetFormData {
  otp: string;
  password: string;
  confirmPassword: string;
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ token?: string; storeId?: string }>();
  const { t, isKhmer } = useAuthLanguage();

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

  // Extract token from route param or URL query params (?token=... or ?code=...)
  const queryParams = new URLSearchParams(location.search);
  const rawToken = params.token || queryParams.get('token') || queryParams.get('code') || '';

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Success screen state & 3s countdown
  const [isSuccess, setIsSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  // 6 discrete PIN cells for OTP entry
  const [otpDigits, setOtpDigits] = useState<string[]>(() => {
    if (rawToken && /^\d{6}$/.test(rawToken)) {
      return rawToken.split('');
    }
    return ['', '', '', '', '', ''];
  });
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isLongToken = Boolean(rawToken && !/^\d{6}$/.test(rawToken));

  const {
    error,
    loading,
    contactMethod,
    email,
    phoneNumber,
    handleResetPassword,
    clearError,
  } = useResetPassword();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ResetFormData>({
    defaultValues: {
      otp: rawToken,
      password: '',
      confirmPassword: '',
    },
  });

  const passwordValue = watch('password') || '';
  const confirmPasswordValue = watch('confirmPassword') || '';

  // Synchronize token if available in URL
  useEffect(() => {
    if (rawToken) {
      setValue('otp', rawToken);
      if (/^\d{6}$/.test(rawToken)) {
        setOtpDigits(rawToken.split(''));
      }
    }
  }, [rawToken, setValue]);

  // Success redirect countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSuccess) {
      if (redirectCountdown > 0) {
        timer = setTimeout(() => {
          setRedirectCountdown((prev) => prev - 1);
        }, 1000);
      } else {
        navigate({ pathname: '/login', search: location.search });
      }
    }
    return () => clearTimeout(timer);
  }, [isSuccess, redirectCountdown, navigate, location.search]);

  // Sync otpDigits to form state
  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = clean;
    setOtpDigits(newDigits);
    const combined = newDigits.join('');
    setValue('otp', combined, { shouldValidate: combined.length === 6 });

    if (clean && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setOtpDigits(newDigits);
    setValue('otp', newDigits.join(''), { shouldValidate: true });

    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  // Password strength calculation
  useEffect(() => {
    let score = 0;
    if (!passwordValue) {
      setPasswordStrength(0);
      return;
    }
    if (passwordValue.length >= 8) score += 30;
    if (/[A-Z]/.test(passwordValue)) score += 25;
    if (/[0-9]/.test(passwordValue)) score += 25;
    if (/[^A-Za-z0-9]/.test(passwordValue)) score += 20;
    setPasswordStrength(Math.min(100, score));
  }, [passwordValue]);

  // Password criteria checks
  const criteria = {
    length: passwordValue.length >= 8,
    uppercase: /[A-Z]/.test(passwordValue),
    numberOrSymbol: /[0-9!@#$%^&*(),.?":{}|<>]/.test(passwordValue),
  };

  const getStrengthLabel = () => {
    if (passwordStrength < 30) return { text: t('signup.strength.weak'), color: 'text-rose-600', bar: 'bg-rose-500' };
    if (passwordStrength < 60) return { text: t('signup.strength.fair'), color: 'text-amber-600', bar: 'bg-amber-500' };
    if (passwordStrength < 85) return { text: t('signup.strength.good'), color: 'text-blue-600', bar: 'bg-blue-500' };
    return { text: t('signup.strength.strong'), color: 'text-emerald-600', bar: 'bg-emerald-500' };
  };

  const onSubmit = async (data: ResetFormData) => {
    const ok = await handleResetPassword(data.otp, data.password);
    if (ok) {
      setIsSuccess(true);
      setRedirectCountdown(3);
    }
  };

  // Detect whether error indicates an expired or invalid token
  const isExpiredOrInvalidToken = Boolean(
    error && /expired|invalid|token|not found|malformed|used/i.test(error)
  );

  // Destination contact display
  const rawContact = contactMethod === 'email' ? email : phoneNumber;
  const maskedContactDisplay = rawContact ? maskContact(rawContact) : '';

  // Render contextual badge
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
      title={isSuccess || isExpiredOrInvalidToken ? undefined : t('reset.title')}
      subtitle={isSuccess || isExpiredOrInvalidToken ? undefined : t('reset.subtitle')}
      badge={renderBadge()}
    >
      {isSuccess ? (
        /* Success Screen with Animated Checkmark and 3s Countdown */
        <div className="space-y-6 text-center animate-in fade-in-50 zoom-in-95 duration-200">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-600 shadow-sm animate-bounce">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <div className="space-y-2">
            <h2 className={cn('text-xl font-bold tracking-tight text-slate-900', isKhmer && 'font-khmer text-2xl')}>
              {isKhmer ? 'ពាក្យសម្ងាត់ត្រូវបានផ្លាស់ប្តូរដោយជោគជ័យ!' : 'Password Reset Successfully!'}
            </h2>
            <p className={cn('text-sm text-slate-600 leading-relaxed max-w-sm mx-auto', isKhmer && 'font-khmer')}>
              {t('reset.success')}
            </p>
          </div>

          {/* Countdown indicator */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-center">
            <p className={cn('text-xs font-medium text-slate-500', isKhmer && 'font-khmer')}>
              {t('reset.countdownRedirect', { seconds: redirectCountdown })}
            </p>
          </div>

          {/* Direct CTA */}
          <Button
            type="button"
            onClick={() => navigate({ pathname: '/login', search: location.search })}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-semibold shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            <span className={isKhmer ? 'font-khmer text-base' : 'text-sm'}>
              {t('action.signInNow')}
            </span>
          </Button>
        </div>
      ) : isExpiredOrInvalidToken ? (
        /* Friendly Invalid / Expired Token Error Card */
        <div className="space-y-6 text-center animate-in fade-in-50 zoom-in-95 duration-200">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 border border-rose-200 text-rose-600 shadow-sm">
            <AlertTriangle className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h2 className={cn('text-xl font-bold tracking-tight text-slate-900', isKhmer && 'font-khmer text-2xl')}>
              {t('reset.invalidTokenTitle')}
            </h2>
            <p className={cn('text-sm text-slate-600 leading-relaxed max-w-sm mx-auto', isKhmer && 'font-khmer')}>
              {t('reset.invalidTokenMessage')}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              type="button"
              onClick={() => {
                clearError();
                navigate({ pathname: '/forgot-password', search: location.search });
              }}
              className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-semibold shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              <div className="flex items-center justify-center gap-2">
                <span className={isKhmer ? 'font-khmer text-base' : 'text-sm'}>
                  {t('action.requestNewLink')}
                </span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </Button>

            <button
              type="button"
              onClick={() => navigate({ pathname: '/login', search: location.search })}
              className={cn(
                'inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors pt-2 block mx-auto',
                isKhmer && 'font-khmer text-sm'
              )}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('nav.backToLogin')}
            </button>
          </div>
        </div>
      ) : (
        /* Password Reset Form */
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Masked Contact Badge */}
          {maskedContactDisplay && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/90 px-3.5 py-2.5 shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <p className={cn('text-xs text-slate-600', isKhmer && 'font-khmer text-sm')}>
                  {isKhmer ? 'កំណត់ពាក្យសម្ងាត់សម្រាប់៖' : 'Resetting for:'}{' '}
                  <strong className="font-semibold text-slate-900">{maskedContactDisplay}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate({ pathname: '/forgot-password', search: location.search })}
                className={cn('text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors', isKhmer && 'font-khmer')}
              >
                {isKhmer ? 'ប្តូរ' : 'Change'}
              </button>
            </div>
          )}

          {/* General Error Alert */}
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

          {/* 6-Digit Code / Reset Token */}
          <div className="space-y-2">
            <label
              htmlFor="reset-otp-0"
              className={cn(
                'text-xs font-semibold uppercase tracking-wider text-slate-700',
                isKhmer && 'text-sm font-medium tracking-normal font-khmer'
              )}
            >
              {isKhmer ? 'លេខកូដផ្ទៀងផ្ទាត់ ៦ ខ្ទង់' : '6-Digit Verification Code'}
              <span className="ml-1 text-red-500">*</span>
            </label>

            {isLongToken ? (
              /* Long token provided via URL link */
              <Controller
                name="otp"
                control={control}
                rules={{ required: t('error.otpRequired') }}
                render={({ field }) => (
                  <div className="relative flex h-12 w-full items-center rounded-xl border border-slate-300 bg-white px-3.5 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/10">
                    <ShieldCheck className="mr-2 h-5 w-5 text-slate-400" />
                    <input
                      {...field}
                      disabled={loading}
                      className="h-full flex-1 bg-transparent font-mono text-sm text-slate-900 focus:outline-none"
                    />
                  </div>
                )}
              />
            ) : (
              /* Segmented 6-box input */
              <div>
                <div className="flex items-center justify-between gap-2" onPaste={handlePaste}>
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      id={`reset-otp-${index}`}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      disabled={loading}
                      onChange={(e) => handleDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className={cn(
                        'h-12 w-full max-w-[50px] rounded-xl border text-center font-mono text-xl font-bold transition-all focus:outline-none focus:ring-4',
                        digit
                          ? 'border-blue-600 bg-blue-50/30 text-blue-900 ring-2 ring-blue-500/10'
                          : errors.otp
                          ? 'border-rose-400 bg-white ring-2 ring-rose-100'
                          : 'border-slate-300 bg-white text-slate-900 hover:border-slate-400 focus:border-blue-600 focus:ring-blue-500/20'
                      )}
                    />
                  ))}
                </div>
                {/* Hidden Controller to bind with react-hook-form */}
                <Controller
                  name="otp"
                  control={control}
                  rules={{
                    required: t('error.otpRequired'),
                    validate: (val) => (val && val.length === 6) || (isKhmer ? 'សូមបញ្ចូលលេខកូដទាំង ៦ ខ្ទង់' : 'Please enter all 6 digits'),
                  }}
                  render={() => <></>}
                />
              </div>
            )}

            {errors.otp && (
              <p className={cn('text-xs text-red-600 font-medium', isKhmer && 'font-khmer')}>
                {errors.otp.message}
              </p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="reset-password"
              className={cn(
                'text-xs font-semibold uppercase tracking-wider text-slate-700',
                isKhmer && 'text-sm font-medium tracking-normal font-khmer'
              )}
            >
              {t('reset.label.newPassword')}
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
                    id="reset-password"
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

            {/* 4-Bar Password Strength Indicator */}
            {passwordValue && (
              <div className="space-y-2 pt-1.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs">
                  <span className={cn('text-slate-500', isKhmer && 'font-khmer')}>
                    {t('signup.passwordStrength')}
                  </span>
                  <span className={cn('font-semibold', getStrengthLabel().color, isKhmer && 'font-khmer')}>
                    {getStrengthLabel().text}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((barIndex) => {
                    const active = passwordStrength >= barIndex * 25;
                    return (
                      <div
                        key={barIndex}
                        className={cn(
                          'h-1.5 rounded-full transition-all duration-300',
                          active ? getStrengthLabel().bar : 'bg-slate-200'
                        )}
                      />
                    );
                  })}
                </div>

                {/* Password criteria checklist */}
                <div className="grid grid-cols-1 gap-1 pt-1 sm:grid-cols-3">
                  <div
                    className={cn(
                      'flex items-center gap-1.5 text-[11px] transition-colors',
                      criteria.length ? 'text-emerald-700' : 'text-slate-400'
                    )}
                  >
                    <CheckCircle2
                      className={cn('h-3.5 w-3.5', criteria.length ? 'text-emerald-600' : 'text-slate-300')}
                    />
                    <span className={isKhmer ? 'font-khmer' : ''}>8+ characters</span>
                  </div>
                  <div
                    className={cn(
                      'flex items-center gap-1.5 text-[11px] transition-colors',
                      criteria.uppercase ? 'text-emerald-700' : 'text-slate-400'
                    )}
                  >
                    <CheckCircle2
                      className={cn('h-3.5 w-3.5', criteria.uppercase ? 'text-emerald-600' : 'text-slate-300')}
                    />
                    <span className={isKhmer ? 'font-khmer' : ''}>1 uppercase</span>
                  </div>
                  <div
                    className={cn(
                      'flex items-center gap-1.5 text-[11px] transition-colors',
                      criteria.numberOrSymbol ? 'text-emerald-700' : 'text-slate-400'
                    )}
                  >
                    <CheckCircle2
                      className={cn('h-3.5 w-3.5', criteria.numberOrSymbol ? 'text-emerald-600' : 'text-slate-300')}
                    />
                    <span className={isKhmer ? 'font-khmer' : ''}>1 number/symbol</span>
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

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="reset-confirm-password"
              className={cn(
                'text-xs font-semibold uppercase tracking-wider text-slate-700',
                isKhmer && 'text-sm font-medium tracking-normal font-khmer'
              )}
            >
              {t('signup.label.confirmPassword')}
              <span className="ml-1 text-red-500">*</span>
            </label>

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
                    errors.confirmPassword
                      ? 'border-red-400 ring-2 ring-red-100'
                      : confirmPasswordValue && confirmPasswordValue === passwordValue
                      ? 'border-emerald-500 ring-2 ring-emerald-100'
                      : 'border-slate-300 hover:border-slate-400 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/10'
                  )}
                >
                  <div className="flex h-full items-center pl-3.5 pr-2 text-slate-400">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <input
                    {...field}
                    id="reset-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    disabled={loading}
                    placeholder={t('signup.placeholder.confirmPassword')}
                    className={cn(
                      'h-full flex-1 bg-transparent px-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none',
                      isKhmer && 'font-khmer'
                    )}
                  />
                  {confirmPasswordValue && confirmPasswordValue === passwordValue && (
                    <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-600" />
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

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className="relative h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-semibold shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] transition-all duration-200 group"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className={isKhmer ? 'font-khmer' : ''}>{t('action.resettingPassword')}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span className={isKhmer ? 'font-khmer text-base' : 'text-sm'}>
                  {t('action.updatePassword')}
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

export default ResetPasswordPage;
