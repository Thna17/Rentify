// src/components/VerifyOtpForm.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@rentify/shared/ui/card';
import { Input } from '@rentify/shared/ui/input';
import { Button } from '@rentify/shared/ui/button';
import { Alert, AlertDescription } from '@rentify/shared/ui/alert';
import { 
  Mail, 
  ShieldCheck, 
  ArrowLeft,
  RotateCcw,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useVerifyOtpMutation, useResendOtpMutation } from '@rentify/apis';
import { cn } from '@rentify/utils';
import { getSafeReturnUrl } from '../utils/returnUrl';

export default function VerifyOtpForm() {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const redirect = getSafeReturnUrl(searchParams.get('redirectUrl'));
  const navigate = useNavigate();

  const [otp, setOtp] = useState<string>('');
  const [resendTime, setResendTime] = useState<number>(60);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation();
  const [resendOtp, { isLoading: isResending }] = useResendOtpMutation();

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendTime > 0) {
      timer = setTimeout(() => setResendTime(resendTime - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (otp.length !== 6) {
      setError('Please enter a 6-digit verification code');
      return;
    }

    try {
      await verifyOtp({ email, otp }).unwrap();
      setSuccess('Email verified successfully! Redirecting...');
      
      // Redirect after success
      setTimeout(() => {
        window.location.href = redirect;
      }, 2000);
    } catch (err: any) {
      setError(err.data?.error || 'Invalid or expired verification code');
    }
  };

  const handleResendOtp = async () => {
    setError('');
    try {
      await resendOtp({ email }).unwrap();
      setResendTime(60);
      setSuccess('A new verification code has been sent to your email');
    } catch (err: any) {
      setError(err.data?.error || 'Failed to resend verification code');
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
  };

  // Auto-submit when OTP is complete
  useEffect(() => {
    if (otp.length === 6) {
      handleSubmit(new Event('submit') as any);
    }
  }, [otp]);

  return (
    <div className="w-full">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/signup')}
        className="mb-6 flex items-center gap-2 text-slate-600 hover:text-slate-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Sign Up
      </Button>

      {/* Header Section */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-400 shadow-xl mx-auto mb-6 flex items-center justify-center transition-all duration-300 hover:scale-105">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-br bg-clip-text text-transparent from-slate-900 to-slate-700 mb-3">
          Verify Your Email
        </h1>
        <p className="text-slate-600 text-lg">
          Enter the 6-digit code sent to your email
        </p>
      </div>

      {/* Verification Card */}
      <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-lg rounded-3xl overflow-hidden">
        <CardHeader className="text-center pb-6 pt-8">
          <CardTitle className="text-xl font-bold text-slate-800">Email Verification</CardTitle>
          <CardDescription className="text-slate-600">
            We sent a code to <span className="font-semibold text-slate-800">{email}</span>
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* OTP Input */}
            <div className="space-y-3">
              <label htmlFor="otp" className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Verification Code
              </label>
              
              <div className="relative">
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={otp}
                  onChange={handleOtpChange}
                  placeholder="000000"
                  className="h-14 text-center text-2xl font-bold tracking-widest placeholder:tracking-normal placeholder:text-slate-400 border-slate-300 focus:border-purple-500 transition-colors duration-200 rounded-xl"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                />
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <ShieldCheck className="w-5 h-5 text-slate-400" />
                </div>
              </div>
              
              <p className="text-sm text-slate-500 text-center">
                Enter the 6-digit code from your email
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="animate-in fade-in-80 rounded-xl border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Alert */}
            {success && (
              <Alert className="animate-in slide-in-from-top-5 bg-emerald-50 border-emerald-200 rounded-xl">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-800">
                  {success}
                </AlertDescription>
              </Alert>
            )}

            {/* Verify Button */}
            <Button 
              type="submit" 
              disabled={isVerifying || otp.length !== 6}
              className="w-full h-12  from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-semibold shadow-lg shadow-purple-500/25 transition-all duration-200 rounded-xl group"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                <>
                  Verify Email
                  <CheckCircle className="w-4 h-4 ml-2 group-hover:scale-110 transition-transform duration-200" />
                </>
              )}
            </Button>

            {/* Resend Code Section */}
            <div className="text-center pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-600 mb-3">
                Didn't receive the code?
              </p>
              
              <Button
                variant="outline"
                onClick={handleResendOtp}
                disabled={resendTime > 0 || isResending}
                className="w-full h-11 border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-all duration-200 rounded-xl"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : resendTime > 0 ? (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Resend in {resendTime}s
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Resend Code
                  </>
                )}
              </Button>
            </div>

            {/* OTP Input Visualization */}
            <div className="flex justify-center space-x-3">
              {[...Array(6)].map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "w-12 h-12 rounded-lg border-2 flex items-center justify-center text-lg font-bold transition-all duration-200",
                    index < otp.length
                      ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm"
                      : "border-slate-300 bg-slate-50 text-slate-400",
                    index === otp.length ? "ring-2 ring-purple-300 border-purple-500" : ""
                  )}
                >
                  {otp[index] || ""}
                </div>
              ))}
            </div>

            {/* Manual OTP Entry Hint */}
            <div className="text-center">
              <p className="text-xs text-slate-500">
                Tip: You can also paste the code or type it directly
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Additional Help */}
      <div className="text-center mt-6">
        <p className="text-sm text-slate-600">
          Having trouble? Check your spam folder or{' '}
          <Button
            variant="link"
            className="p-0 h-auto font-semibold text-purple-600 hover:text-purple-700"
            onClick={handleResendOtp}
            disabled={resendTime > 0}
          >
            try again
          </Button>
        </p>
      </div>
    </div>
  );
}
