// pages/SignupPage.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useSignupForm } from '../hooks/useSignupForm';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@rentify/shared/ui/card';
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
import { Tabs, TabsList, TabsTrigger } from '@rentify/shared/ui/tabs';
import { Progress } from '@rentify/shared/ui/progress';
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
  Bot,
} from 'lucide-react';
import { cn } from '@rentify/utils';

interface SignupFormData {
  name: string;
  contact: string;
  password: string;
  confirmPassword: string;
}

function SignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

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
    formatCambodianPhone,
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
  const contact = form.watch('contact');

  const calculatePasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength += 25;
    if (/[A-Z]/.test(pwd)) strength += 25;
    if (/[a-z]/.test(pwd)) strength += 25;
    if (/[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) strength += 25;
    return strength;
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 25) return 'bg-red-500';
    if (passwordStrength < 50) return 'bg-orange-500';
    if (passwordStrength < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 25) return 'Weak';
    if (passwordStrength < 50) return 'Fair';
    if (passwordStrength < 75) return 'Good';
    return 'Strong';
  };

  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(password));
  }, [password]);

  const handleInputModeChange = (mode: 'email' | 'phone') => {
    form.setValue('contact', '');
    form.trigger('contact');
  };

  const onSubmit = (data: SignupFormData) => {
    const formattedContact = data.contact;
    handleSignup({
      name: data.name,
      contact: formattedContact,
      password: data.password,
      inputMode: form.getValues('contact').includes('@') ? 'email' : 'phone',
    });
  };

  const steps = [
    { label: 'Account Details', value: 'signup', icon: User },
    ...(verificationMethod === 'telegram'
      ? [{ label: 'Link Telegram', value: 'link', icon: Bot }]
      : []),
    { label: 'Verify Account', value: 'verify', icon: Shield },
  ];

  const activeStepIndex = steps.findIndex((s) => s.value === step);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/20 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className={cn(
              'w-16 h-16 rounded-2xl bg-gradient-to-br shadow-lg mx-auto mb-4 flex items-center justify-center',
              isWebsiteTemplate
                ? 'from-blue-500 to-cyan-400'
                : 'from-violet-600 to-purple-500'
            )}
          >
            {isWebsiteTemplate ? (
              <ShoppingBag className="w-8 h-8 text-white" />
            ) : (
              <Store className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-br bg-clip-text text-transparent from-slate-900 to-slate-700 mb-2">
            {isWebsiteTemplate
              ? 'Create Customer Account'
              : isMarketplace ? 'Create Rentify Buyer Account' : 'Create Merchant Account'}
          </h1>
          <p className="text-slate-600">
            {isWebsiteTemplate
              ? 'Sign up for a seamless shopping experience'
              : isMarketplace ? 'One account for the marketplace and Rentify stores' : 'Set up your online store in minutes'}
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((stepItem, index) => (
              <React.Fragment key={stepItem.value}>
                <div className="flex items-center">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                      index < activeStepIndex
                        ? 'bg-green-500 border-green-500 text-white'
                        : index === activeStepIndex
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-slate-300 bg-white text-slate-400'
                    )}
                  >
                    {index < activeStepIndex ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <stepItem.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'ml-2 text-sm font-medium hidden sm:block',
                      index <= activeStepIndex
                        ? 'text-slate-900'
                        : 'text-slate-500'
                    )}
                  >
                    {stepItem.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-2 transition-colors duration-300',
                      index < activeStepIndex ? 'bg-green-500' : 'bg-slate-300'
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Domain Validation Alert */}
        {!domainValid && (
          <Alert variant="destructive" className="mb-4 animate-in fade-in-80">
            <AlertDescription>
              The domain is not valid. Please check your website URL.
            </AlertDescription>
          </Alert>
        )}

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-semibold">
              {step === 'signup' && 'Create your account'}
              {step === 'link' && 'Link Telegram Account'}
              {step === 'verify' && 'Verify your account'}
            </CardTitle>
            <CardDescription>
              {step === 'signup' && 'Enter your details to get started'}
              {step === 'link' &&
                'Connect your Telegram for secure authentication'}
              {step === 'verify' && 'Enter the verification code sent to you'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Signup Form */}
            {step === 'signup' && (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  {/* Name Field */}
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
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                            <Input
                              {...field}
                              placeholder="John Doe"
                              className="pl-10 h-11"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Contact Method Tabs */}
                  <Tabs
                    defaultValue="email"
                    className="w-full"
                    onValueChange={(value) => {
                      if (value === 'email' || value === 'phone')
                        handleInputModeChange(value);
                    }}
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger
                        value="email"
                        className="flex items-center gap-2"
                      >
                        <Mail className="w-4 h-4" />
                        Email
                      </TabsTrigger>
                      <TabsTrigger
                        value="phone"
                        className="flex items-center gap-2"
                      >
                        <Phone className="w-4 h-4" />
                        Phone
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Contact Field */}
                  <FormField
                    control={form.control}
                    name="contact"
                    rules={{
                      required: 'Email or phone number is required',
                      validate: (value) => {
                        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                          value
                        );
                        const isPhone = validateCambodianPhone(value);
                        return (
                          isEmail ||
                          isPhone ||
                          'Please enter a valid email or phone number'
                        );
                      },
                    }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email or Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="your.email@example.com or phone number"
                            className="h-11"
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value.includes('@')) {
                                field.onChange(value);
                              } else {
                                field.onChange(formatCambodianPhone(value));
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Password Field */}
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
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Create a strong password"
                              className="h-11 pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
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
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">
                                Password strength
                              </span>
                              <span
                                className={cn(
                                  'font-medium',
                                  passwordStrength < 25
                                    ? 'text-red-600'
                                    : passwordStrength < 50
                                    ? 'text-orange-600'
                                    : passwordStrength < 75
                                    ? 'text-yellow-600'
                                    : 'text-green-600'
                                )}
                              >
                                {getPasswordStrengthText()}
                              </span>
                            </div>
                            <Progress
                              value={passwordStrength}
                              className={getPasswordStrengthColor()}
                            />
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Confirm Password Field */}
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
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showConfirmPassword ? 'text' : 'password'}
                              placeholder="Confirm your password"
                              className="h-11 pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
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

                  {/* Error Alert */}
                  {error && (
                    <Alert
                      variant="destructive"
                      className="animate-in fade-in-80"
                    >
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-medium shadow-lg shadow-blue-500/25 transition-all duration-200"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>

                  {/* Sign in link */}
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

            {/* Telegram Link Step */}
            {step === 'link' && (
              <TelegramLinkStep
                onBack={() => setStep('signup')}
                onCheckLink={checkTelegramLink}
                loading={loading}
                botLink="https://t.me/rentify_customer_bot"
              />
            )}

            {/* Verification Step */}
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

            {/* Success Message */}
            {success && (
              <Alert className="animate-in slide-in-from-top-5 bg-emerald-50 border-emerald-200 mt-4">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-800">
                  {success}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
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

      <Alert className="bg-blue-50 border-blue-200">
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
          className="w-full bg-blue-500 hover:bg-blue-600 text-white"
        >
          <Bot className="w-4 h-4 mr-2" />
          Open Telegram Bot
        </Button>

        <Button
          variant="outline"
          onClick={onCheckLink}
          disabled={loading}
          className="w-full"
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

      <Alert className="bg-blue-50 border-blue-200">
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
            className="h-12 text-center text-xl tracking-widest font-mono"
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
          className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
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
