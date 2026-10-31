import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLazyGetTelegramSessionQuery } from '@rentify/apis';
import { Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { useAuthLanguage } from '../context/AuthLanguageContext';
import { cn } from '@rentify/utils';

export const TelegramCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, isKhmer } = useAuthLanguage();
  const sessionToken = searchParams.get('sessionToken') || searchParams.get('token');

  const [triggerGetSession] = useLazyGetTelegramSessionQuery();
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'expired' | 'error'>('loading');
  const [destination, setDestination] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionToken) {
      setStatus('expired');
      return;
    }

    let isMounted = true;
    let pollCount = 0;
    const maxPolls = 30; // 60 seconds max

    const checkSession = async () => {
      try {
        const result = await triggerGetSession(sessionToken, false).unwrap();
        if (!isMounted) return;

        if (result?.status === 'authenticated') {
          setStatus('authenticated');
          setDestination(result.destination || '/');
          setTimeout(() => {
            window.location.assign(result.destination || '/');
          }, 800);
          return true;
        }

        if (result?.status === 'expired') {
          setStatus('expired');
          return true;
        }
      } catch (err: any) {
        if (!isMounted) return false;
        if (err?.status === 404 || err?.data?.status === 'expired') {
          setStatus('expired');
          return true;
        }
      }
      return false;
    };

    // Run first check immediately
    checkSession().then((done) => {
      if (done) return;

      const interval = setInterval(async () => {
        pollCount += 1;
        const finished = await checkSession();
        if (finished || pollCount >= maxPolls) {
          clearInterval(interval);
          if (pollCount >= maxPolls && isMounted && status === 'loading') {
            setStatus('expired');
          }
        }
      }, 2000);

      return () => clearInterval(interval);
    });

    return () => {
      isMounted = false;
    };
  }, [sessionToken, triggerGetSession]);

  return (
    <div
      lang={isKhmer ? 'km' : 'en'}
      className={cn(
        'relative flex min-h-screen items-center justify-center bg-[#f7f8fb] px-4 py-8',
        isKhmer && 'font-khmer'
      )}
    >
      <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-xl shadow-slate-200/60">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-[#229ED9]">
          <svg className="h-9 w-9" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.6 7.55c-.12.55-.45.68-.91.42l-2.47-1.82-1.19 1.15c-.13.13-.24.24-.49.24l.18-2.51 4.57-4.13c.2-.18-.04-.28-.31-.1l-5.65 3.56-2.44-.76c-.53-.16-.54-.53.11-.78l9.54-3.68c.44-.16.83.1.66.87z" />
          </svg>
        </div>

        {status === 'loading' && (
          <div>
            <div className="flex items-center justify-center gap-2 text-slate-800">
              <Loader2 className="h-5 w-5 animate-spin text-[#229ED9]" />
              <h2 className="text-xl font-bold tracking-tight">
                {isKhmer ? 'កំពុងផ្ទៀងផ្ទាត់ជាមួយ Telegram...' : 'Authorizing with Telegram...'}
              </h2>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {isKhmer
                ? 'សូមរង់ចាំបន្តិច ប្រព័ន្ធកំពុងចូលគណនីរបស់អ្នក។'
                : 'Please wait while we complete your sign-in.'}
            </p>
          </div>
        )}

        {status === 'authenticated' && (
          <div>
            <div className="flex items-center justify-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
              <h2 className="text-xl font-bold tracking-tight">
                {isKhmer ? 'ចូលគណនីបានជោគជ័យ!' : 'Sign-in Successful!'}
              </h2>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {isKhmer
                ? 'កំពុងបញ្ជូនអ្នកទៅកាន់ផ្ទាំងគ្រប់គ្រង...'
                : 'Redirecting you to your workspace...'}
            </p>
            {destination && (
              <Button
                onClick={() => window.location.assign(destination)}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 font-medium text-white shadow"
              >
                <span>{isKhmer ? 'បន្តទៅមុខ' : 'Continue'}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {(status === 'expired' || status === 'error') && (
          <div>
            <div className="flex items-center justify-center gap-2 text-amber-600">
              <AlertCircle className="h-6 w-6" />
              <h2 className="text-xl font-bold tracking-tight">
                {isKhmer ? 'សម័យចូលគណនីបានផុតកំណត់' : 'Login Session Expired'}
              </h2>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {isKhmer
                ? 'តំណភ្ជាប់នេះបានផុតកំណត់ ឬមិនត្រឹមត្រូវ។ សូមព្យាយាមចូលម្តងទៀត។'
                : 'This Telegram authorization link is invalid or has expired. Please try again.'}
            </p>
            <Button
              onClick={() => navigate('/login')}
              className="mt-6 w-full rounded-xl bg-primary py-2.5 font-medium text-white shadow"
            >
              {isKhmer ? 'ត្រឡប់ទៅទំព័រចូលគណនី' : 'Back to Sign In'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TelegramCallbackPage;
