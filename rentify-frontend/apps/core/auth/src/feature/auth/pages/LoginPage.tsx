// pages/LoginPage.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLoginForm } from '../hooks/useLoginForm';
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
  ArrowRight,
  KeyRound,
  User,
  ShieldCheck,
  PackageCheck,
  UsersRound,
} from 'lucide-react';
import { cn } from '@rentify/utils';

interface LoginFormData {
  contact: string;
  password: string;
}

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const {
    error,
    success,
    loading,
    inputMode,
    setInputMode,
    handleLogin,
    handleGoogleLogin,
    handleTelegramLogin,
    telegramEnabled,
    formatCambodianPhone,
    validateCambodianPhone,
    isWebsiteTemplate,
  } = useLoginForm();

  const form = useForm<LoginFormData>({
    defaultValues: {
      contact: '',
      password: '',
    },
  });

  const onSubmit = (data: LoginFormData) => {
    handleLogin(data);
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  // Switching between email and phone clears the old value and its errors
  const switchMode = (mode: 'email' | 'phone') => {
    if (mode === inputMode) return;
    setInputMode(mode);
    form.resetField('contact');
    form.clearErrors();
  };

  const needsVerification = /not verified/i.test(error || '');

  const handleVerify = () => {
    const contact = form.getValues('contact');
    navigate({
      pathname: '/verify-email',
      search: `?email=${encodeURIComponent(contact)}`,
    });
  };

  const handleSignUp = () => {
    navigate({ pathname: '/signup', search: location.search });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f7f8fb] px-4 py-8 sm:px-6">
      <div className="relative grid w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-xl shadow-slate-200/60 lg:min-h-[680px] lg:grid-cols-[0.9fr_1.1fr]">
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
              Everything your business needs, in one place.
            </h1>
            <p className="mt-5 max-w-sm text-base leading-7 text-slate-500">
              Return to your workspace to manage products, orders, and customers
              with clarity.
            </p>
          </div>
          <div className="relative space-y-4 text-sm text-slate-600">
            <div className="flex items-center gap-3">
              <PackageCheck className="h-5 w-5 text-slate-400" /> Keep products and orders in
              sync
            </div>
            <div className="flex items-center gap-3">
              <UsersRound className="h-5 w-5 text-slate-400" /> Stay connected with your
              customers
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-slate-400" /> Secure access to your
              workspace
            </div>
          </div>
        </aside>

        <main className="flex items-center px-6 py-10 sm:px-12 sm:py-12 lg:px-16 lg:py-16">
          <div className="mx-auto w-full max-w-[460px]">
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
                RENTIFY
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                Welcome back
              </h2>
              <p className="mt-2 text-base text-slate-600">
                Sign in to continue to your Rentify workspace.
              </p>
            </div>
            {/* Google Login Button */}
            <Button
              onClick={handleGoogleLogin}
              disabled={loading}
              variant="outline"
              className="mb-6 inline-flex h-12 w-full items-center justify-center rounded-xl !border-slate-300 !bg-white !text-slate-700 transition-all duration-200 hover:!border-slate-400 hover:!bg-slate-50 hover:!text-slate-900 dark:!border-slate-300 dark:!bg-white dark:!text-slate-700 dark:hover:!bg-slate-50 dark:hover:!text-slate-900"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            {telegramEnabled && (
              <Button
                onClick={handleTelegramLogin}
                disabled={loading}
                variant="outline"
                className="-mt-3 mb-6 inline-flex h-12 w-full items-center justify-center rounded-xl !border-slate-300 !bg-white !text-slate-700 transition-all duration-200 hover:!border-slate-400 hover:!bg-slate-50 hover:!text-slate-900 dark:!border-slate-300 dark:!bg-white dark:!text-slate-700 dark:hover:!bg-slate-50 dark:hover:!text-slate-900"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" aria-hidden>
                  <circle cx="12" cy="12" r="12" fill="#229ED9" />
                  <path
                    fill="#fff"
                    d="M5.4 11.8l11.6-4.5c.54-.2 1 .13.83.94l-2 9.3c-.14.66-.54.82-1.1.51l-3-2.2-1.45 1.4c-.16.16-.3.3-.6.3l.21-3.05 5.56-5.02c.24-.21-.05-.33-.38-.12l-6.87 4.33-2.96-.92c-.64-.2-.66-.64.14-.95z"
                  />
                </svg>
                Continue with Telegram
              </Button>
            )}

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-slate-600 font-medium">
                  Or continue with email/phone
                </span>
              </div>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-5"
              >
                {/* Contact method switch: the white pill slides to the active option */}
                <div className="grid grid-cols-2 rounded-xl bg-slate-100/80 p-1">
                  {(['email', 'phone'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => switchMode(mode)}
                      className={cn(
                        'relative flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors duration-200',
                        inputMode === mode ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'
                      )}
                    >
                      {inputMode === mode && (
                        <motion.span
                          layoutId="login-mode-pill"
                          className="absolute inset-0 rounded-lg bg-white shadow-sm"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        />
                      )}
                      <span className="relative flex items-center gap-2">
                        {mode === 'email' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                        {mode === 'email' ? 'Email' : 'Phone'}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Contact Field: flips over when switching email/phone */}
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
                    required: 'Email or phone number is required',
                    validate: {
                      valid: (value) =>
                        (inputMode === 'email' &&
                          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) ||
                        (inputMode === 'phone' &&
                          validateCambodianPhone(value)) ||
                        'Please enter a valid email or phone number',
                    },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {inputMode === 'email'
                          ? 'Email Address'
                          : 'Phone Number'}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={inputMode === 'email' ? 'email' : 'tel'}
                            placeholder={
                              inputMode === 'email'
                                ? 'Email'
                                : 'Phone number'
                            }
                            onChange={(e) => {
                              if (inputMode === 'phone') {
                                field.onChange(
                                  formatCambodianPhone(e.target.value)
                                );
                              } else {
                                field.onChange(e.target.value);
                              }
                            }}
                            className="h-12 pl-10 rounded-xl border-slate-300 placeholder:text-slate-400 text-slate-900 focus:border-blue-500 transition-colors duration-200"
                          />
                          {inputMode === 'email' ? (
                            <Mail className="absolute left-3 top-1/2 w-4 -translate-y-1/2 text-slate-400" />
                          ) : (
                            <Phone className="absolute left-3 top-1/2 w-4 -translate-y-1/2 text-slate-400" />
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                </motion.div>
                </AnimatePresence>
                </div>

                {/* Password Field */}
                <FormField
                  control={form.control}
                  name="password"
                  rules={{ required: 'Password is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-slate-700 font-medium flex items-center gap-2">
                          <KeyRound className="w-4 h-4" />
                          Password
                        </FormLabel>
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200"
                          onClick={handleForgotPassword}
                        >
                          Forgot password?
                        </Button>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password"
                            className="h-12 pl-10 pr-10 rounded-xl border-slate-300 placeholder:text-slate-400 text-slate-900 focus:border-blue-500 transition-colors duration-200"
                          />
                          <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={
                              showPassword ? 'Hide password' : 'Show password'
                            }
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Error Alert */}
                {error && (
                  <Alert
                    variant="destructive"
                    className="animate-in fade-in-80 rounded-xl border-red-200 bg-red-50"
                  >
                    <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-red-800">
                      <span>{error}</span>
                      {needsVerification && (
                        <button
                          type="button"
                          onClick={handleVerify}
                          className="font-semibold text-red-700 underline underline-offset-2 hover:text-red-900"
                        >
                          Verify now
                        </button>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="inline-flex w-full h-12 items-center justify-center bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold shadow-lg shadow-blue-500/25 transition-all duration-200 rounded-xl group"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                    </>
                  )}
                </Button>

                {/* Success Alert */}
                {success && (
                  <Alert className="animate-in slide-in-from-top-5 bg-emerald-50 border-emerald-200 rounded-xl">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <AlertDescription className="text-emerald-800">
                      {success}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Sign up link */}
                <div className="text-center pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600">
                    Don't have an account?{' '}
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto font-semibold text-blue-600 hover:text-blue-700 transition-colors duration-200"
                      onClick={handleSignUp}
                    >
                      Create account
                    </Button>
                  </p>
                </div>
              </form>
            </Form>
          </div>
        </main>
      </div>
    </div>
  );
}

export default LoginPage;
