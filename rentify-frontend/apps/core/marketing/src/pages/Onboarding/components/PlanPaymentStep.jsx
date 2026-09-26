import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { CheckCircle2, Clock, ExternalLink, LogIn, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCheckPaymentStatusQuery, useInitiateKHQRPaymentMutation } from '@rentify/apis';
import { AUTH_URL } from '@rentify/shared/config/urls';
import { useLanguage } from '../../../contexts/LanguageContext';
import { EASE } from '../../../components/site/motion';
import { NoteCard, SectionHeading } from './OnboardingFields';

const money = (value) => `$${Number(value || 0).toFixed(2)}`;
const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

// Paid plans are paid here by KHQR. The server sets the amount from the plan
// and only accepts this payment when the store is created.
const PlanPaymentStep = ({ data, onUpdate, onNext }) => {
  const { t } = useLanguage();
  const plan = data.package;
  const paid = data.payment?.paymentId && data.payment?.packageId === plan?.id;

  const [payment, setPayment] = useState(null);
  const [state, setState] = useState(paid ? 'success' : 'idle');
  const [countdown, setCountdown] = useState(0);
  const started = useRef(false);
  const [initiate] = useInitiateKHQRPaymentMutation();
  const { data: status } = useCheckPaymentStatusQuery(payment?.paymentId, {
    skip: !payment?.paymentId || state !== 'pending',
    pollingInterval: 4000,
  });

  const start = useCallback(async () => {
    setState('initiating');
    try {
      const response = await initiate({ packageId: plan.id }).unwrap();
      setPayment(response);
      setCountdown(Math.max(0, Math.floor((new Date(response.expiresAt) - Date.now()) / 1000)));
      setState('pending');
    } catch (error) {
      setState(error?.status === 401 ? 'signin' : 'failed');
    }
  }, [initiate, plan?.id]);

  useEffect(() => {
    if (paid || started.current || !plan?.id) return;
    started.current = true;
    start();
  }, [paid, plan?.id, start]);

  useEffect(() => {
    if (!status) return;
    if (status.status === 'completed') {
      setState('success');
      onUpdate({ payment: { paymentId: status.id, packageId: plan.id, method: 'khqr' } });
      const timer = setTimeout(onNext, 1600);
      return () => clearTimeout(timer);
    }
    if (status.status === 'expired' || status.status === 'failed') setState(status.status);
    return undefined;
  }, [status?.status]);

  useEffect(() => {
    if (state !== 'pending') return undefined;
    const timer = setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          setState('expired');
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [state]);

  const signInUrl = `${AUTH_URL}/login?returnUrl=${encodeURIComponent(window.location.href)}`;

  return (
    <section>
      <SectionHeading title={t('onboarding.khqr.title')} description={t('onboarding.khqr.description')} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* QR card */}
        <div className="flex flex-col items-center rounded-[24px] bg-white px-6 py-10 text-center ring-1 ring-black/[0.05]">
          {state === 'success' ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="flex flex-col items-center py-10"
            >
              <CheckCircle2 className="h-16 w-16 text-[#34c759]" strokeWidth={1.5} />
              <p className="mt-4 text-[22px] font-semibold text-[#1d1d1f]">{t('onboarding.khqr.success')}</p>
              <p className="mt-1 text-[14px] text-[#6e6e73]">{t('onboarding.khqr.successBody')}</p>
            </motion.div>
          ) : state === 'signin' ? (
            <div className="flex flex-col items-center py-10">
              <LogIn className="h-12 w-12 text-[#0071e3]" strokeWidth={1.5} />
              <p className="mt-4 text-[20px] font-semibold text-[#1d1d1f]">{t('onboarding.khqr.signinTitle')}</p>
              <p className="mt-1 max-w-sm text-[14px] text-[#6e6e73]">{t('onboarding.khqr.signinBody')}</p>
              <a
                href={signInUrl}
                className="mt-6 flex h-11 items-center rounded-full bg-[#0071e3] px-6 text-[15px] font-medium text-white hover:bg-[#0077ed]"
              >
                {t('onboarding.khqr.signin')}
              </a>
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-white p-3 ring-1 ring-black/[0.08]">
                <div className="flex h-[240px] w-[240px] items-center justify-center">
                  {state === 'pending' && payment?.rawQR ? (
                    <QRCodeSVG value={payment.rawQR} size={240} level="M" />
                  ) : state === 'initiating' ? (
                    <span className="h-10 w-10 animate-spin rounded-full border-2 border-[#0071e3]/20 border-t-[#0071e3]" />
                  ) : (
                    <div className="text-[14px] text-[#6e6e73]">
                      {state === 'expired' ? t('onboarding.khqr.expired') : t('onboarding.khqr.failed')}
                    </div>
                  )}
                </div>
              </div>

              <p className="mt-5 text-[34px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">{money(plan?.price)}</p>
              <p className="text-[13px] text-[#6e6e73]">{t('onboarding.khqr.scan')}</p>

              {state === 'pending' && (
                <p className="mt-4 flex items-center gap-1.5 text-[13px] text-[#6e6e73]">
                  <Clock className="h-3.5 w-3.5" />
                  {t('onboarding.khqr.expiresIn')} {formatTime(countdown)}
                  <span className="ml-2 flex items-center gap-1 text-[#0071e3]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0071e3]" />
                    {t('onboarding.khqr.waiting')}
                  </span>
                </p>
              )}

              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {payment?.qrCodeUrl && state === 'pending' && (
                  <a
                    href={payment.qrCodeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-10 items-center gap-1.5 rounded-full bg-[#f5f5f7] px-4 text-[14px] text-[#1d1d1f] hover:bg-[#ebebed]"
                  >
                    {t('onboarding.khqr.openApp')}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                {(state === 'expired' || state === 'failed') && (
                  <button
                    type="button"
                    onClick={start}
                    className="flex h-10 items-center gap-1.5 rounded-full bg-[#0071e3] px-5 text-[14px] font-medium text-white hover:bg-[#0077ed]"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t('onboarding.khqr.newQr')}
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Order summary */}
        <div className="space-y-4">
          <div className="rounded-[24px] bg-white p-6 ring-1 ring-black/[0.05]">
            <p className="text-[13px] font-semibold text-[#1d1d1f]">{t('onboarding.khqr.summary')}</p>
            <dl className="mt-4 space-y-3 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-[#6e6e73]">{t('onboarding.khqr.plan')}</dt>
                <dd className="font-medium text-[#1d1d1f]">{plan?.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#6e6e73]">{t('onboarding.khqr.period')}</dt>
                <dd className="text-[#1d1d1f]">{plan?.duration}</dd>
              </div>
              <div className="flex justify-between border-t border-black/[0.06] pt-3">
                <dt className="font-medium text-[#1d1d1f]">{t('onboarding.pricingStep.dueToday')}</dt>
                <dd className="text-[20px] font-semibold text-[#1d1d1f]">{money(plan?.price)}</dd>
              </div>
            </dl>
          </div>
          <NoteCard icon={ShieldCheck} title={t('onboarding.khqr.noteTitle')} body={t('onboarding.khqr.noteBody')} />
        </div>
      </div>
    </section>
  );
};

export default PlanPaymentStep;
