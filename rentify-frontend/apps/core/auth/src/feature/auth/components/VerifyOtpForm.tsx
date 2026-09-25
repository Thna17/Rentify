import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Send,
  Edit2,
} from 'lucide-react';
import {
  useVerifyOtpMutation,
  useResendOtpMutation,
  useVerifyCustomerOtpMutation,
  useResendOtpCustomerMutation,
} from '@rentify/apis';
import { useWebsiteData } from '@rentify/shared/context/WebsiteContext';
import { useAuthConfig } from '../utils/authUtils';
import { useAuthLanguage } from '../context/AuthLanguageContext';
import { getSafeReturnUrl } from '../utils/returnUrl';
import { sanitizePhoneNumber, maskContact } from '../utils/phoneUtils';
import { Button } from '@rentify/shared/ui/button';
import { Alert, AlertDescription } from '@rentify/shared/ui/alert';
import { cn } from '@rentify/utils';

export default function VerifyOtpForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, isKhmer } = useAuthLanguage();
  const { websiteId } = useWebsiteData();
  const { isWebsiteTemplate, isHostedStorefrontBuyer } = useAuthConfig();

  const isCustomerFlow = isWebsiteTemplate || isHostedStorefrontBuyer;

  const emailParam = searchParams.get('email') || '';
  const phoneParam = searchParams.get('phone') || searchParams.get('phoneNumber') || '';
  const rawContact = phoneParam || emailParam || '';
  const isPhone = Boolean(phoneParam || (rawContact && !rawContact.includes('@')));
  const redirect = getSafeReturnUrl(searchParams.get('redirectUrl'));

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendTime, setResendTime] = useState<number>(60);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [shouldShake, setShouldShake] = useState<boolean>(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [verifyOtp, { isLoading: isVerifyingCore }] = useVerifyOtpMutation();
  const [verifyCustomerOtp, { isLoading: isVerifyingCustomer }] = useVerifyCustomerOtpMutation();
  const [resendOtp, { isLoading: isResendingCore }] = useResendOtpMutation();
  const [resendCustomerOtp, { isLoading: isResendingCustomer }] = useResendOtpCustomerMutation();

  const isVerifying = isVerifyingCore || isVerifyingCustomer;
  const isResending = isResendingCore || isResendingCustomer;

  // 60-second countdown timer for resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTime > 0) {
      timer = setTimeout(() => setResendTime((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTime]);

  // Shake animation trigger on error
  useEffect(() => {
    if (error) {
      setShouldShake(true);
      const timer = setTimeout(() => setShouldShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const otpCode = digits.join('');

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Handle cell input and auto-advance / auto-submit
  const handleChange = (index: number, value: string) => {
    const cleanDigit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleanDigit;
    setDigits(newDigits);

    if (cleanDigit) {
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      } else {
        // 6th digit entered
        const completeCode = newDigits.join('');
        if (completeCode.length === 6) {
          submitVerification(completeCode);
        }
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || '';
    }
    setDigits(newDigits);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (pastedData.length === 6) {
      submitVerification(pastedData);
    }
  };

  const submitVerification = async (codeToVerify: string) => {
    if (codeToVerify.length !== 6) {
      setError(t('error.otpRequired'));
      return;
    }

    setError('');
    setSuccess('');

    try {
      const sanitizedPhone = phoneParam ? sanitizePhoneNumber(phoneParam) : undefined;
      const payload: any = {
        otp: codeToVerify,
        verificationMethod: isPhone ? 'telegram' : 'email',
      };
      if (emailParam) payload.email = emailParam;
      if (sanitizedPhone) payload.phoneNumber = sanitizedPhone;

      if (isCustomerFlow && websiteId) {
        payload.storeId = websiteId;
        try {
          await verifyCustomerOtp(payload).unwrap();
        } catch {
          await verifyOtp(payload).unwrap();
        }
      } else {
        await verifyOtp(payload).unwrap();
      }

      setSuccess(
        isKhmer
          ? 'ការផ្ទៀងផ្ទាត់ជោគជ័យ! កំពុងបញ្ជូនបន្ត…'
          : 'Account verified successfully! Redirecting…'
      );

      setTimeout(() => {
        window.location.href = redirect;
      }, 1500);
    } catch (err: any) {
      setError(
        err?.data?.error ||
          (isKhmer
            ? 'លេខកូដសម្ងាត់ OTP មិនត្រឹមត្រូវ ឬផុតកំណត់'
            : 'Invalid or expired OTP')
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitVerification(otpCode);
  };

  const handleResend = async () => {
    if (resendTime > 0 || isResending) return;

    setError('');
    setSuccess('');
    try {
      const sanitizedPhone = phoneParam ? sanitizePhoneNumber(phoneParam) : undefined;
      const payload: any = {
        verificationMethod: isPhone ? 'telegram' : 'email',
      };
      if (emailParam) payload.email = emailParam;
      if (sanitizedPhone) payload.phoneNumber = sanitizedPhone;

      if (isCustomerFlow && websiteId) {
        payload.storeId = websiteId;
        await resendCustomerOtp(payload).unwrap();
      } else {
        await resendOtp(payload).unwrap();
      }

      setResendTime(60);
      setSuccess(
        isKhmer
          ? 'លេខកូដថ្មីត្រូវបានផ្ញើជូនហើយ'
          : 'A new verification code has been sent'
      );
    } catch (err: any) {
      setError(
        err?.data?.error ||
          (isKhmer ? 'មិនអាចផ្ញើលេខកូដឡើងវិញបានទេ' : 'Failed to resend code')
      );
    }
  };

  const handleChangeContact = () => {
    navigate({ pathname: '/signup', search: window.location.search });
  };

  const maskedDestination = rawContact ? maskContact(rawContact) : '';

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('space-y-6 transition-transform duration-200', shouldShake && 'animate-shake')}
      noValidate
    >
      {/* Visual Destination Badge */}
      {maskedDestination && (
        <div className="flex flex-col items-center justify-center p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-sm animate-in fade-in-50">
          <span className={cn('text-xs text-slate-500 font-medium text-center', isKhmer && 'font-khmer')}>
            {isKhmer
              ? 'យើងបានផ្ញើលេខកូដសម្ងាត់ ៦ ខ្ទង់ទៅកាន់'
              : 'We sent a 6-digit verification code to'}
          </span>
          <span className="font-mono text-sm font-bold text-slate-800 mt-1 tracking-wide">
            {maskedDestination}
          </span>
          <button
            type="button"
            onClick={handleChangeContact}
            className={cn(
              'mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors',
              isKhmer && 'font-khmer text-sm'
            )}
          >
            <Edit2 className="h-3 w-3" />
            <span>{t('verify.changeContact')}</span>
          </button>
        </div>
      )}

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

      {/* Success Alert */}
      {success && (
        <Alert className="flex items-start gap-3 rounded-2xl border-emerald-200 bg-emerald-50 text-emerald-900 shadow-sm animate-in fade-in-50 zoom-in-95">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600 mt-0.5 animate-bounce" />
          <AlertDescription className={cn('text-sm font-bold leading-relaxed text-emerald-900', isKhmer && 'font-khmer')}>
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* 6 Individual PIN Digit Boxes */}
      <div className="space-y-3">
        <div className="flex justify-between items-center gap-2 sm:gap-3" onPaste={handlePaste}>
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              autoFocus={idx === 0}
              value={digit}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className={cn(
                'h-14 w-11 sm:h-15 sm:w-14 rounded-2xl border-2 text-center font-mono text-2xl font-bold transition-all focus:outline-none',
                digit
                  ? 'border-blue-600 bg-blue-50/40 text-blue-900 shadow-sm'
                  : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10'
              )}
            />
          ))}
        </div>

        <p className={cn('text-center text-xs text-slate-400', isKhmer && 'font-khmer')}>
          {isKhmer
            ? 'អ្នកអាចចម្លង ឬវាយបញ្ចូលលេខកូដ ៦ ខ្ទង់ដោយផ្ទាល់'
            : 'Type or paste the 6-digit code directly'}
        </p>
      </div>

      {/* Primary Submit Button */}
      <Button
        type="submit"
        disabled={isVerifying || otpCode.length !== 6}
        className="relative h-12 w-full rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white font-semibold shadow-lg shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] transition-all duration-200 group disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isVerifying ? (
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
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        )}
      </Button>

      {/* Resend Code Section with Cooldown */}
      <div className="pt-2 text-center border-t border-slate-100">
        <p className={cn('text-xs text-slate-500 mb-1.5', isKhmer && 'font-khmer')}>
          {t('verify.didNotReceive')}
        </p>
        <button
          type="button"
          onClick={handleResend}
          disabled={resendTime > 0 || isResending}
          className={cn(
            'inline-flex items-center gap-1.5 text-xs font-semibold transition-colors',
            resendTime > 0
              ? 'text-slate-400 cursor-not-allowed'
              : 'text-blue-600 hover:text-blue-700 hover:underline',
            isKhmer && 'font-khmer text-sm'
          )}
        >
          <RotateCcw className={cn('h-3.5 w-3.5', isResending && 'animate-spin')} />
          {resendTime > 0
            ? t('verify.resendIn', { seconds: resendTime })
            : t('action.resendCode')}
        </button>
      </div>

      {/* Cambodian Telegram Fallback Option */}
      {isPhone && (
        <div className="pt-2 border-t border-slate-100 animate-in fade-in-50">
          <p className={cn('text-xs text-slate-500 mb-2 text-center', isKhmer && 'font-khmer')}>
            {isKhmer
              ? 'មិនទាន់ទទួលបានសារ SMS ឬយឺតយ៉ាវ?'
              : 'SMS delayed or not received?'}
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.open('https://t.me/rentify_customer_bot', '_blank')}
            className="w-full h-11 rounded-xl border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-sky-800 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <Send className="h-4 w-4 text-[#229ED9]" />
            <span className={isKhmer ? 'font-khmer' : ''}>
              {t('verify.telegramVerify')}
            </span>
          </Button>
        </div>
      )}

      {/* Back to sign in */}
      <div className="text-center pt-1">
        <button
          type="button"
          onClick={() => navigate({ pathname: '/login', search: window.location.search })}
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
  );
}
