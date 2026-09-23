// src/pages/ResetPasswordPage.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { useResetPassword } from '../hooks/useResetPassword';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@rentify/shared/ui/card';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@rentify/shared/ui/form';
import { Input } from '@rentify/shared/ui/input';
import { Button } from '@rentify/shared/ui/button';
import { Alert, AlertDescription } from '@rentify/shared/ui/alert';
import { Progress } from '@rentify/shared/ui/progress';
import { 
  Eye, 
  EyeOff, 
  CheckCircle,
  Loader2,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@rentify/utils';

interface ResetFormData {
  otp: string;
  password: string;
  confirmPassword: string;
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  const {
    error,
    success,
    loading,
    contactMethod,
    email,
    phoneNumber,
    handleResetPassword,
    formatCambodianPhone,
  } = useResetPassword();

  const form = useForm<ResetFormData>({
    defaultValues: {
      otp: '',
      password: '',
      confirmPassword: ''
    }
  });

  const password = form.watch('password');

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

  const onSubmitReset = (data: ResetFormData) => {
    if (data.password !== data.confirmPassword) {
      form.setError('confirmPassword', {
        type: 'manual',
        message: 'Passwords do not match',
      });
      return;
    }
    handleResetPassword(data.otp, data.password);
  };

  const contactInfo = contactMethod === 'email' 
    ? email 
    : phoneNumber ? formatCambodianPhone(phoneNumber) : '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/20 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg mx-auto mb-4 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-br bg-clip-text text-transparent from-slate-900 to-slate-700 mb-2">
            Create New Password
          </h1>
          <p className="text-slate-600">
            Enter the six-digit code we sent, then choose a new password.
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-semibold">Reset your password</CardTitle>
            <CardDescription>
              The reset code expires after 10 minutes.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {contactInfo && (
              <div className="text-center mb-6 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600">
                  Resetting password for: <strong className="text-slate-900">{contactInfo}</strong>
                </p>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitReset)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="otp"
                  rules={{
                    required: 'Reset code is required',
                    pattern: { value: /^\d{6}$/, message: 'Enter the six-digit reset code' },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reset Code</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          placeholder="Enter 6-digit code"
                          onChange={(event) => field.onChange(event.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="h-11 text-center text-lg font-semibold tracking-[0.35em]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* New Password Field */}
                <FormField
                  control={form.control}
                  name="password"
                  rules={{ 
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Password must be at least 8 characters' }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
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
                            <span className="text-slate-600">Password strength</span>
                            <span className={cn(
                              "font-medium",
                              passwordStrength < 25 ? "text-red-600" :
                              passwordStrength < 50 ? "text-orange-600" :
                              passwordStrength < 75 ? "text-yellow-600" : "text-green-600"
                            )}>
                              {getPasswordStrengthText()}
                            </span>
                          </div>
                          <Progress value={passwordStrength} className={getPasswordStrengthColor()} />
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
                    validate: value => value === password || 'Passwords do not match'
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Confirm your new password"
                            className="h-11 pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
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

                {/* Error Alert */}
                {error && (
                  <Alert variant="destructive" className="animate-in fade-in-80">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Success Alert */}
                {success && (
                  <Alert className="animate-in slide-in-from-top-5 bg-emerald-50 border-emerald-200">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <AlertDescription className="text-emerald-800">
                      {success}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full h-11 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white font-medium shadow-lg shadow-green-500/25 transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Resetting password...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>

                {/* Back to login link */}
                <div className="text-center pt-4 border-t border-slate-200">
                  <Button
                    variant="link"
                    className="p-0 h-auto font-semibold text-blue-600 hover:text-blue-700"
                    onClick={() => navigate('/login')}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to sign in
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
