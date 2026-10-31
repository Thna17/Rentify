// pages/SignupPage.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useSignupForm } from '../hooks/useSignupForm';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@rentify/shared/ui/form';
import { Input } from '@rentify/shared/ui/input';
import { Button } from '@rentify/shared/ui/button';
import { Alert, AlertDescription } from '@rentify/shared/ui/alert';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Mail,
  Phone,
  Store,
  ShoppingBag,
  CheckCircle,
  Loader2,
  User,
  Shield,
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Bot,
} from 'lucide-react';
import { cn } from '@rentify/utils';
import { useAuthLanguage } from '../context/AuthLanguageContext';
import { LanguageToggle } from '../components/LanguageToggle';

interface SignupFormData {
  name: string;
  contact: string;
  password: string;
  confirmPassword: string;
}

// Local Cambodian number without the country code, e.g. "12 345 678"
const formatLocalPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 9);
  return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5)]
    .filter(Boolean)
    .join(' ');
};

const inputClass =
  'h-12 w-full rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 hover:border-slate-400';

function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [inputMode, setInputMode] = useState<'email' | 'phone'>('email');
  const { t, isKhmer } = useAuthLanguage();

  const {
    step,
    setStep,
    email,
    otp,
    error,
    success,
    loading,
    domainValid,
    verificationMethod,
    setOtp,
    handleSignup,
    handleResendOtp,
    handleVerifyOtp,
    checkTelegramLink,
    validateCambodianPhone,
    isWebsiteTemplate,
    isMarketplace,
  } = useSignupForm();

  const form = useForm<SignupFormData>({
    defaultValues: {
      name: '',
      contact: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = form.watch('password');

  const passwordStrength = (() => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) strength += 25;
    return strength;
  })();

  const strengthLabel =
    passwordStrength < 25
      ? { text: t('signup.strength.weak'), color: 'text-red-600', bar: 'bg-red-500' }
      : passwordStrength < 50
      ? { text: t('signup.strength.fair'), color: 'text-orange-600', bar: 'bg-orange-500' }
      : passwordStrength < 75
      ? { text: t('signup.strength.good'), color: 'text-yellow-600', bar: 'bg-yellow-500' }
      : { text: t('signup.strength.strong'), color: 'text-green-600', bar: 'bg-green-500' };

  const switchMode = (mode: 'email' | 'phone') => {
    if (mode === inputMode) return;
    setInputMode(mode);
    form.resetField('contact');
    form.clearErrors('contact');
  };

  const toFullPhone = (local: string) => '855' + local.replace(/\D/g, '');

  const onSubmit = (data: SignupFormData) => {
    handleSignup({
      name: data.name,
      contact: inputMode === 'phone' ? toFullPhone(data.contact) : data.contact,
      password: data.password,
      inputMode,
    });
  };

  const steps = [
    { label: t('signup.step.details'), value: 'signup', icon: User },
    ...(verificationMethod === 'telegram'
      ? [{ label: t('signup.step.telegram'), value: 'link', icon: Bot }]
      : []),
    { label: t('signup.step.verify'), value: 'verify', icon: Shield },
  ];
  const activeStepIndex = steps.findIndex((s) => s.value === step);

  const title = isWebsiteTemplate
    ? t('signup.title.customerAccount')
    : isMarketplace
    ? t('signup.title.rentifyAccount')
    : t('signup.title.merchantAccount');
  const subtitle = isWebsiteTemplate
    ? t('signup.subtitle.customerAccount')
    : isMarketplace
    ? t('signup.subtitle.rentifyAccount')
    : t('signup.subtitle.merchantAccount');

  const stepHeading = {
    signup: { title, subtitle },
    link: {
      title: t('signup.linkTitle'),
      subtitle: t('signup.linkSubtitle'),
    },
    verify: {
      title: t('verify.accountTitle'),
      subtitle: t('signup.verifySubtitle'),
    },
  }[step];

  return (
    <div lang={isKhmer ? 'km' : 'en'} className={cn('relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f8fb] px-4 py-8 sm:px-6', isKhmer && 'font-khmer')}>
      <div className="relative grid w-full max-w-6xl overflow-hidden rounded-3xl border-0 bg-white shadow-2xl shadow-slate-200/70 lg:min-h-[680px] lg:grid-cols-[0.9fr_1.1fr]">
        <aside
          className={cn(
            'relative hidden overflow-hidden p-12 lg:flex lg:flex-col lg:justify-between',
            isWebsiteTemplate
              ? 'bg-gradient-to-br from-sky-50 via-blue-50/60 to-white'
              : 'bg-gradient-to-br from-violet-50 via-indigo-50/60 to-white'
          )}
        >
          <div className="relative">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-2xl',
                isWebsiteTemplate ? 'bg-blue-100 text-blue-600' : 'bg-violet-100 text-violet-600'
              )}
            >
              {isWebsiteTemplate ? (
                <ShoppingBag className="h-6 w-6" />
              ) : (
                <Store className="h-6 w-6" />
              )}
            </div>
            <p
              className={cn(
                'mt-10 text-sm font-semibold uppercase tracking-[0.2em]',
                isWebsiteTemplate ? 'text-blue-600/70' : 'text-violet-600/70'
              )}
            >
              Rentify
            </p>
            <h1 className="mt-4 max-w-sm text-4xl font-bold leading-tight tracking-tight text-slate-900">
              {t('signup.heroTitle')}
            </h1>
            <p className="mt-5 max-w-sm text-base leading-7 text-slate-500">
              {t('signup.heroSubtitle')}
            </p>
          </div>

          {/* Progress through the signup steps */}
          <ol className="relative space-y-4 text-sm">
            {steps.map((s, index) => {
              const done = index < activeStepIndex;
              const active = index === activeStepIndex;
              const accent = isWebsiteTemplate ? 'blue' : 'violet';
              return (
                <li key={s.value} className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full ring-1 transition-colors',
                      done
                        ? accent === 'blue'
                          ? 'bg-blue-600 text-white ring-blue-600'
                          : 'bg-violet-600 text-white ring-violet-600'
                        : active
                        ? accent === 'blue'
                          ? 'bg-blue-100 text-blue-700 ring-blue-300'
                          : 'bg-violet-100 text-violet-700 ring-violet-300'
                        : 'text-slate-400 ring-slate-200'
                    )}
                  >
                    {done ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <s.icon className="h-4 w-4" />
                    )}
                  </span>
                  <span className={active || done ? 'text-slate-900' : 'text-slate-400'}>
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </aside>

        <main className="flex items-center px-6 py-10 sm:px-12 sm:py-12 lg:px-16 lg:py-16">
          <div className="mx-auto w-full max-w-[460px]">
            <div className="mb-6 flex justify-end">
              <LanguageToggle />
            </div>
            <div className="mb-8">
              <div
                className={cn(
                  'mb-6 flex h-12 w-12 items-center justify-center rounded-2xl lg:hidden',
                  isWebsiteTemplate ? 'bg-blue-100 text-blue-600' : 'bg-violet-100 text-violet-600'
                )}
              >
                {isWebsiteTemplate ? (
                  <ShoppingBag className="h-6 w-6" />
                ) : (
                  <Store className="h-6 w-6" />
                )}
              </div>
              <p className="text-sm font-semibold text-blue-600 lg:hidden">
                RENTIFY · {t('signup.stepOf', { current: activeStepIndex + 1, total: steps.length })}
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {stepHeading.title}
              </h2>
              <p className="mt-2 text-base text-slate-600">
                {stepHeading.subtitle}
              </p>
            </div>

            {!domainValid && (
              <Alert variant="destructive" className="mb-5 rounded-xl">
                <AlertDescription>
                  {t('error.domainInvalid')}
                </AlertDescription>
              </Alert>
            )}

            {step === 'signup' && (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-5"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    rules={{
                      required: t('error.nameRequired'),
                      minLength: {
                        value: 2,
                        message: t('error.nameMin'),
                      },
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-medium">
                          {t('signup.label.name')}
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              placeholder={t('signup.placeholder.nameEnter')}
                              autoComplete="name"
                              className={cn(inputClass, 'pl-10')}
                            />
                            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Contact method switch */}
                  <div className="grid grid-cols-2 rounded-xl bg-slate-100/80 p-1">
                    {(['email', 'phone'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => switchMode(mode)}
                        className={cn(
                          'relative flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors duration-200',
                          inputMode === mode
                            ? 'text-slate-900'
                            : 'text-slate-500 hover:text-slate-700'
                        )}
                      >
                        {inputMode === mode && (
                          <motion.span
                            layoutId="signup-mode-pill"
                            className="absolute inset-0 rounded-lg bg-white shadow-sm"
                            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                          />
                        )}
                        <span className="relative flex items-center gap-2">
                          {mode === 'email' ? (
                            <Mail className="h-4 w-4" />
                          ) : (
                            <Phone className="h-4 w-4" />
                          )}
                          {mode === 'email' ? t('auth.email') : t('auth.phoneShort')}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Contact field flips over when switching email/phone, like login */}
                  <div style={{ perspective: 800 }}>
                  <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={inputMode}
                    initial={{ opacity: 0, rotateX: -80, y: -6 }}
                    animate={{ opacity: 1, rotateX: 0, y: 0 }}
                    exit={{ opacity: 0, rotateX: 80, y: 6 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    style={{ transformOrigin: 'center' }}
                  >
                  <FormField
                    control={form.control}
                    name="contact"
                    rules={{
                      required:
                        inputMode === 'email'
                          ? t('error.emailRequired')
                          : t('error.phoneRequired'),
                      validate: (value) =>
                        inputMode === 'email'
                          ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ||
                            t('error.invalidEmail')
                          : validateCambodianPhone(toFullPhone(value)) ||
                            t('error.invalidPhone'),
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-medium">
                          {inputMode === 'email' ? t('login.tab.email') : t('login.tab.phone')}
                        </FormLabel>
                        <FormControl>
                          {inputMode === 'email' ? (
                            <div className="relative">
                              <Input
                                {...field}
                                type="email"
                                autoComplete="email"
                                placeholder={t('auth.emailPlaceholder')}
                                className={cn(inputClass, 'pl-10')}
                              />
                              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>
                          ) : (
                            <div className="flex h-12 w-full overflow-hidden rounded-xl border border-slate-300 bg-white transition-all duration-200 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/20 hover:border-slate-400">
                              <span className="flex select-none items-center gap-2 border-r border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700">
                                <span aria-hidden>🇰🇭</span>
                                +855
                              </span>
                              <input
                                {...field}
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel-national"
                                placeholder="12 345 678"
                                onChange={(e) =>
                                  field.onChange(formatLocalPhone(e.target.value))
                                }
                                className="h-full w-full bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                              />
                            </div>
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  </motion.div>
                  </AnimatePresence>
                  </div>

                  <FormField
                    control={form.control}
                    name="password"
                    rules={{
                      required: t('error.passwordRequired'),
                      minLength: {
                        value: 8,
                        message: t('error.passwordMin'),
                      },
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-medium">
                          {t('login.label.password')}
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPassword ? 'text' : 'password'}
                              autoComplete="new-password"
                              placeholder={t('signup.tip.length')}
                              className={cn(inputClass, 'pl-10 pr-10')}
                            />
                            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent rounded-xl"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-slate-500" />
                              ) : (
                                <Eye className="h-4 w-4 text-slate-500" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        {password && (
                          <div className="flex items-center gap-3 pt-1">
                            <div className="grid flex-1 grid-cols-4 gap-1.5">
                              {[25, 50, 75, 100].map((level) => (
                                <span
                                  key={level}
                                  className={cn(
                                    'h-1.5 rounded-full transition-colors',
                                    passwordStrength >= level
                                      ? strengthLabel.bar
                                      : 'bg-slate-200'
                                  )}
                                />
                              ))}
                            </div>
                            <span className={cn('text-xs font-medium', strengthLabel.color)}>
                              {strengthLabel.text}
                            </span>
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    rules={{
                      required: t('error.confirmRequired'),
                      validate: (value) =>
                        value === password || t('error.passwordMatch'),
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-medium">
                          {t('signup.label.confirmPassword')}
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showConfirmPassword ? 'text' : 'password'}
                              autoComplete="new-password"
                              placeholder={t('signup.placeholder.confirmPassword')}
                              className={cn(inputClass, 'pl-10 pr-10')}
                            />
                            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent rounded-xl"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4 text-slate-500" />
                              ) : (
                                <Eye className="h-4 w-4 text-slate-500" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {error && (
                    <Alert
                      variant="destructive"
                      className="animate-in fade-in-80 rounded-xl border-red-200 bg-red-50"
                    >
                      <AlertDescription className="text-red-800">{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="inline-flex w-full h-12 items-center justify-center bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold shadow-lg shadow-blue-500/25 transition-all duration-200 rounded-xl group"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        {t('action.signingUp')}
                      </>
                    ) : (
                      <>
                        {t('action.signUp')}
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                      </>
                    )}
                  </Button>

                  <div className="text-center pt-4 border-t border-slate-200">
                    <p className="text-sm text-slate-600">
                      {t('signup.hasAccount')}{' '}
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto font-semibold text-blue-600 hover:text-blue-700"
                        onClick={() => navigate({ pathname: '/', search: location.search })}
                      >
                        {t('action.signIn')}
                      </Button>
                    </p>
                  </div>
                </form>
              </Form>
            )}

            {step === 'link' && (
              <TelegramLinkStep
                onBack={() => setStep('signup')}
                onCheckLink={checkTelegramLink}
                loading={loading}
                botLink="https://t.me/rentify_customer_bot"
              />
            )}

            {step === 'verify' && (
              <VerificationStep
                email={email}
                otp={otp}
                error={error}
                loading={loading}
                verificationMethod={verificationMethod}
                onBack={() =>
                  setStep(verificationMethod === 'telegram' ? 'link' : 'signup')
                }
                onOtpChange={setOtp}
                onVerify={handleVerifyOtp}
                onResend={handleResendOtp}
              />
            )}

            {success && (
              <Alert className="animate-in slide-in-from-top-5 bg-emerald-50 border-emerald-200 rounded-xl mt-5">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-800">
                  {success}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// Telegram Link Step Component
interface TelegramLinkStepProps {
  onBack: () => void;
  onCheckLink: () => void;
  loading?: boolean;
  botLink?: string;
}

const TelegramLinkStep: React.FC<TelegramLinkStepProps> = ({
  onBack,
  onCheckLink,
  loading = false,
  botLink = 'https://t.me/rentify_customer_bot',
}) => {
  const { t } = useAuthLanguage();
  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={onBack}
        className="p-0 h-auto text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('action.back')}
      </Button>

      <Alert className="rounded-xl bg-blue-50 border-blue-200">
        <Bot className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          {t('signup.telegramRequired')}
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">{t('signup.linkHeading')}</h3>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
              1
            </div>
            <p className="text-sm">
              <strong>{t('signup.linkStep1Strong')}</strong> {t('signup.linkStep1')}{' '}
              <a
                href={botLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
              >
                @{botLink.replace('https://t.me/', '')}
              </a>
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
              2
            </div>
            <p className="text-sm">
              <strong>{t('signup.linkStep2Strong')}</strong> {t('signup.linkStep2')}
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
              3
            </div>
            <p className="text-sm">
              <strong>{t('signup.linkStep3Strong')}</strong> {t('signup.linkStep3')}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Button
          onClick={() => window.open(botLink, '_blank')}
          className="w-full h-12 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold"
        >
          <Bot className="w-4 h-4 mr-2" />
          {t('signup.openBot')}
        </Button>

        <Button
          variant="outline"
          onClick={onCheckLink}
          disabled={loading}
          className="w-full h-12 rounded-xl bg-white text-slate-700"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          {t('signup.linkedConfirm')}
        </Button>
      </div>
    </div>
  );
};

// Verification Step Component
interface VerificationStepProps {
  email: string;
  otp: string;
  error?: string;
  loading?: boolean;
  verificationMethod: 'email' | 'telegram';
  onBack: () => void;
  onOtpChange: (val: string) => void;
  onVerify: () => void;
  onResend: () => void;
}

const VerificationStep: React.FC<VerificationStepProps> = ({
  email,
  otp,
  error,
  loading = false,
  verificationMethod,
  onBack,
  onOtpChange,
  onVerify,
  onResend,
}) => {
  const { t } = useAuthLanguage();
  const [resendTime, setResendTime] = useState(0);

  const handleResend = () => {
    onResend();
    setResendTime(30);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTime > 0) {
      timer = setTimeout(() => setResendTime(resendTime - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTime]);

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={onBack}
        className="p-0 h-auto text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('action.back')}
      </Button>

      <Alert className="rounded-xl bg-blue-50 border-blue-200">
        {verificationMethod === 'email' ? (
          <Mail className="h-4 w-4 text-blue-600" />
        ) : (
          <Bot className="h-4 w-4 text-blue-600" />
        )}
        <AlertDescription className="text-blue-800">
          {verificationMethod === 'email'
            ? t('verify.subtitle', { destination: email })
            : t('signup.checkTelegram')}
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">
            {t('verify.codeLabel')}
          </label>
          <Input
            value={otp}
            onChange={(e) =>
              onOtpChange(e.target.value.replace(/\D/g, '').slice(0, 6))
            }
            placeholder="••••••"
            maxLength={6}
            className="h-14 rounded-xl text-center text-2xl tracking-[0.5em] font-mono"
          />
        </div>

        {error && (
          <Alert variant="destructive" className="animate-in fade-in-80">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={onVerify}
          disabled={loading || otp.length !== 6}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold shadow-lg shadow-blue-500/25"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            t('signup.verifyAccount')
          )}
        </Button>

        <div className="text-center">
          <p className="text-sm text-slate-600 mb-2">
            {t('verify.didNotReceive')}
          </p>
          <Button
            variant="link"
            onClick={handleResend}
            disabled={loading || resendTime > 0}
            className="text-blue-600"
          >
            {resendTime > 0 ? t('verify.resendIn', { seconds: resendTime }) : t('action.resendCode')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
