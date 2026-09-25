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
  'h-12 rounded-xl border-slate-300 focus:border-blue-500 transition-colors duration-200';

function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [inputMode, setInputMode] = useState<'email' | 'phone'>('email');

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
      ? { text: 'Weak', color: 'text-red-600', bar: 'bg-red-500' }
      : passwordStrength < 50
      ? { text: 'Fair', color: 'text-orange-600', bar: 'bg-orange-500' }
      : passwordStrength < 75
      ? { text: 'Good', color: 'text-yellow-600', bar: 'bg-yellow-500' }
      : { text: 'Strong', color: 'text-green-600', bar: 'bg-green-500' };

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
    { label: 'Details', value: 'signup', icon: User },
    ...(verificationMethod === 'telegram'
      ? [{ label: 'Telegram', value: 'link', icon: Bot }]
      : []),
    { label: 'Verify', value: 'verify', icon: Shield },
  ];
  const activeStepIndex = steps.findIndex((s) => s.value === step);

  const title = isWebsiteTemplate
    ? 'Create customer account'
    : isMarketplace
    ? 'Create your Rentify account'
    : 'Create merchant account';
  const subtitle = isWebsiteTemplate
    ? 'Sign up for a seamless shopping experience.'
    : isMarketplace
    ? 'One account for the marketplace and Rentify stores.'
    : 'Set up your online store in minutes.';

  const stepHeading = {
    signup: { title, subtitle },
    link: {
      title: 'Link Telegram',
      subtitle: 'Connect Telegram to receive your verification code.',
    },
    verify: {
      title: 'Verify your account',
      subtitle: 'Enter the 6-digit code we sent you.',
    },
  }[step];

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-8 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_#2563eb_0,_transparent_36%),radial-gradient(circle_at_bottom_right,_#7c3aed_0,_transparent_34%)] opacity-70" />
      <div className="relative grid w-full max-w-6xl overflow-hidden rounded-[2rem] lg:min-h-[720px] bg-white shadow-2xl shadow-slate-950/40 lg:grid-cols-[0.9fr_1.1fr]">
        <aside
          className={cn(
            'relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between',
            isWebsiteTemplate
              ? 'bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-800'
              : 'bg-gradient-to-br from-violet-600 via-indigo-700 to-slate-950'
          )}
        >
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              {isWebsiteTemplate ? (
                <ShoppingBag className="h-6 w-6" />
              ) : (
                <Store className="h-6 w-6" />
              )}
            </div>
            <p className="mt-10 text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
              Rentify
            </p>
            <h1 className="mt-4 max-w-sm text-4xl font-bold leading-tight">
              Start selling and shopping in minutes.
            </h1>
            <p className="mt-5 max-w-sm text-base leading-7 text-white/75">
              Create one account to manage your store, reach the marketplace,
              and serve your customers.
            </p>
          </div>

          {/* Progress through the signup steps */}
          <ol className="relative space-y-4 text-sm">
            {steps.map((s, index) => {
              const done = index < activeStepIndex;
              const active = index === activeStepIndex;
              return (
                <li key={s.value} className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full ring-1 transition-colors',
                      done
                        ? 'bg-white text-indigo-700 ring-white'
                        : active
                        ? 'bg-white/20 text-white ring-white/60'
                        : 'text-white/50 ring-white/25'
                    )}
                  >
                    {done ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <s.icon className="h-4 w-4" />
                    )}
                  </span>
                  <span className={active || done ? 'text-white' : 'text-white/55'}>
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </aside>

        <main className="flex items-center px-6 py-10 sm:px-12 sm:py-12 lg:px-16 lg:py-16">
          <div className="mx-auto w-full max-w-[460px]">
            <div className="mb-8">
              <div
                className={cn(
                  'mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg lg:hidden',
                  isWebsiteTemplate
                    ? 'from-sky-500 to-blue-600 shadow-blue-500/30'
                    : 'from-violet-500 to-indigo-600 shadow-violet-500/30'
                )}
              >
                {isWebsiteTemplate ? (
                  <ShoppingBag className="h-6 w-6" />
                ) : (
                  <Store className="h-6 w-6" />
                )}
              </div>
              <p className="text-sm font-semibold text-blue-600 lg:hidden">
                RENTIFY · Step {activeStepIndex + 1} of {steps.length}
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
                  The domain is not valid. Please check your website URL.
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
                      required: 'Name is required',
                      minLength: {
                        value: 2,
                        message: 'Name must be at least 2 characters',
                      },
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-medium">
                          Full name
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              placeholder="John Doe"
                              autoComplete="name"
                              className={cn(inputClass, 'pl-10')}
                            />
                            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
                          {mode === 'email' ? 'Email' : 'Phone'}
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
                          ? 'Email is required'
                          : 'Phone number is required',
                      validate: (value) =>
                        inputMode === 'email'
                          ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ||
                            'Please enter a valid email address'
                          : validateCambodianPhone(toFullPhone(value)) ||
                            'Please enter a valid Cambodian phone number',
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-medium">
                          {inputMode === 'email' ? 'Email address' : 'Phone number'}
                        </FormLabel>
                        <FormControl>
                          {inputMode === 'email' ? (
                            <div className="relative">
                              <Input
                                {...field}
                                type="email"
                                autoComplete="email"
                                placeholder="your.email@example.com"
                                className={cn(inputClass, 'pl-10')}
                              />
                              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>
                          ) : (
                            <div className="flex h-12 overflow-hidden rounded-xl border border-slate-300 bg-white transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
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
                      required: 'Password is required',
                      minLength: {
                        value: 8,
                        message: 'Password must be at least 8 characters',
                      },
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-medium">
                          Password
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPassword ? 'text' : 'password'}
                              autoComplete="new-password"
                              placeholder="At least 8 characters"
                              className={cn(inputClass, 'pl-10 pr-10')}
                            />
                            <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                      required: 'Please confirm your password',
                      validate: (value) =>
                        value === password || 'Passwords do not match',
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-700 font-medium">
                          Confirm password
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showConfirmPassword ? 'text' : 'password'}
                              autoComplete="new-password"
                              placeholder="Re-enter your password"
                              className={cn(inputClass, 'pl-10 pr-10')}
                            />
                            <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
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
                        Creating account...
                      </>
                    ) : (
                      <>
                        Create account
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                      </>
                    )}
                  </Button>

                  <div className="text-center pt-4 border-t border-slate-200">
                    <p className="text-sm text-slate-600">
                      Already have an account?{' '}
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto font-semibold text-blue-600 hover:text-blue-700"
                        onClick={() => navigate({ pathname: '/', search: location.search })}
                      >
                        Sign in
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
  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={onBack}
        className="p-0 h-auto text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <Alert className="rounded-xl bg-blue-50 border-blue-200">
        <Bot className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          Telegram verification required for secure authentication
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Link your Telegram account</h3>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
              1
            </div>
            <p className="text-sm">
              <strong>Open Telegram</strong> and search for{' '}
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
              <strong>Start a chat</strong> with the bot by clicking the "Start"
              button
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
              3
            </div>
            <p className="text-sm">
              <strong>Share your phone number</strong> when prompted by the bot
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
          Open Telegram Bot
        </Button>

        <Button
          variant="outline"
          onClick={onCheckLink}
          disabled={loading}
          className="w-full h-12 rounded-xl"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          I've Linked My Telegram
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
        Back
      </Button>

      <Alert className="rounded-xl bg-blue-50 border-blue-200">
        {verificationMethod === 'email' ? (
          <Mail className="h-4 w-4 text-blue-600" />
        ) : (
          <Bot className="h-4 w-4 text-blue-600" />
        )}
        <AlertDescription className="text-blue-800">
          {verificationMethod === 'email'
            ? `We sent a 6-digit verification code to ${email}`
            : `Check your Telegram for the verification code`}
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">
            Verification Code
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
            'Verify Account'
          )}
        </Button>

        <div className="text-center">
          <p className="text-sm text-slate-600 mb-2">
            Didn't receive the code?
          </p>
          <Button
            variant="link"
            onClick={handleResend}
            disabled={loading || resendTime > 0}
            className="text-blue-600"
          >
            {resendTime > 0 ? `Resend in ${resendTime}s` : 'Resend Code'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
