import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useWebsiteData } from '@rentify/shared/context/WebsiteContext';
import { useAuthLanguage } from '../context/AuthLanguageContext';
import {
  useSignupMutation,
  useVerifyOtpMutation,
  useSignupCustomerMutation,
  useVerifyCustomerOtpMutation,
  useResendOtpCustomerMutation,
  useResendOtpMutation,
  useLazyCheckTelegramLinkQuery,
  useLazyCheckTelegramLinkCustomerQuery,
  useLoginWithTelegramMutation,
  useGetTelegramLoginConfigQuery,
} from '@rentify/apis';
import {
  sanitizePhoneNumber,
  formatCambodianPhone,
  validateCambodianPhone,
} from '../utils/phoneUtils';
import { useAuthConfig, loadTelegramWidget, requestTelegramAuth } from '../utils/authUtils';
import { MARKETING_URL } from '@rentify/shared/config/urls';

export const useSignupForm = () => {
  const { t } = useAuthLanguage();
  const [step, setStep] = useState<'signup' | 'link' | 'verify'>('signup');
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<'email' | 'telegram'>('email');
  const [domainValid, setDomainValid] = useState(true);
  const [signupData, setSignupData] = useState<{
    name: string;
    email: string;
    phoneNumber: string;
    password: string;
    confirmPassword: string;
  } | null>(null);

  const [signupMutation, { isLoading: isSignupLoading }] = useSignupMutation();
  const [verifyOtpMutation] = useVerifyOtpMutation();
  const [resendOtpMutation] = useResendOtpMutation();
  const [triggerCheckTelegramLink] = useLazyCheckTelegramLinkQuery();

  const [signupCustomerMutation, { isLoading: isSignupCustomerLoading }] =
    useSignupCustomerMutation();
  const [verifyCustomerOtpMutation] = useVerifyCustomerOtpMutation();
  const [resendOtpCustomerMutation] = useResendOtpCustomerMutation();
  const [triggerCheckTelegramLinkCustomer] =
    useLazyCheckTelegramLinkCustomerQuery();

  const location = useLocation();
  const { websiteId } = useWebsiteData();

  const {
    redirectUrl,
    hasExplicitReturnUrl,
    returnDomain,
    isWebsiteTemplate,
    isHostedStorefrontBuyer,
    isMarketplace,
  } = useAuthConfig();

  const resolvePostSignupRedirect = () => {
    if (isWebsiteTemplate || isHostedStorefrontBuyer || isMarketplace || hasExplicitReturnUrl) {
      return redirectUrl;
    }
    return `${MARKETING_URL.replace(/\/+$/, '')}/start`;
  };

  useEffect(() => {
    const otpParam = new URLSearchParams(window.location.search).get('otp');
    if (otpParam?.length === 6) {
      setOtp(otpParam);
      setStep('verify');
    }
  }, []);

  useEffect(() => {
    if (step === 'link' && verificationMethod === 'telegram') {
      const interval = setInterval(() => {
        checkTelegramLink();
      }, 5000);
      setPollingInterval(interval);
      return () => clearInterval(interval);
    }
  }, [step, verificationMethod]);

  const checkTelegramLink = async () => {
    try {
      if (!signupData) return;

      const sanitizedPhone = signupData.phoneNumber
        ? sanitizePhoneNumber(signupData.phoneNumber)
        : '';
      const response = isWebsiteTemplate
        ? await triggerCheckTelegramLinkCustomer({
            phoneNumber: sanitizedPhone,
          }).unwrap()
        : await triggerCheckTelegramLink({
            phoneNumber: sanitizedPhone,
          }).unwrap();

      if (response.isLinked) {
        if (pollingInterval) clearInterval(pollingInterval);
        setSuccess('signup.telegramLinked');
        setStep('verify');
      }
    } catch (err) {
      console.error('Telegram link check error:', err);
    }
  };

  const handleSignup = async (data: {
    name: string;
    contact: string;
    password: string;
    inputMode: 'email' | 'phone';
  }) => {
    setError('');
    setSuccess('');

    const { name, contact, password, inputMode } = data;
    const cleanName = (name || '').trim();
    const formattedContact = (contact || '').trim();

    const isEmail = inputMode === 'email' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formattedContact);
    const isPhone = inputMode === 'phone' && validateCambodianPhone(formattedContact);

    if (!cleanName) return setError('error.nameRequired');
    if (!isEmail && !isPhone) {
      return setError(
        inputMode === 'phone' ? 'error.invalidPhone' : 'error.invalidEmail'
      );
    }

    // Store data for later use
    setSignupData({
      name,
      email: isEmail ? contact : '',
      phoneNumber: isPhone ? formattedContact : '',
      password,
      confirmPassword: password,
    });

    const method = isEmail ? 'email' : 'telegram';

    const userData: any = {
      name,
      email: isEmail ? contact : null,
      phoneNumber: isPhone ? sanitizePhoneNumber(formattedContact) : null,
      password,
      verificationMethod: method,
    };

    try {
      if (isWebsiteTemplate) {
        userData.storeId = websiteId;
        await signupCustomerMutation(userData).unwrap();
      } else {
        await signupMutation(userData).unwrap();
      }

      setVerificationMethod(method);
      setStep(method === 'telegram' ? 'link' : 'verify');
      setSuccess(method === 'telegram' ? 'signup.linkTelegramPrompt' : 'signup.otpSentEmail');
    } catch (err: any) {
      // Backend text is only used to pick a catalog message, never shown.
      const rawMsg = err?.data?.error || err?.data?.message || err?.message || '';
      let mappedError = 'error.signupFailed';
      const lower = String(rawMsg).toLowerCase();
      if (
        lower.includes('already exists') ||
        lower.includes('in use') ||
        lower.includes('duplicate')
      ) {
        mappedError = inputMode === 'phone' ? 'error.phoneTaken' : 'error.emailTaken';
      }
      setError(mappedError);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setSuccess('');

    if (!signupData) {
      setError('error.signupDataMissing');
      return;
    }

    const sanitizedPhone = signupData.phoneNumber
      ? sanitizePhoneNumber(signupData.phoneNumber)
      : null;
    const payload: any = {
      email: verificationMethod === 'email' ? signupData.email : null,
      phoneNumber: verificationMethod === 'telegram' ? sanitizedPhone : null,
      verificationMethod,
    };

    try {
      if (isWebsiteTemplate) {
        payload.storeId = websiteId;
        await resendOtpCustomerMutation(payload).unwrap();
      } else {
        await resendOtpMutation(payload).unwrap();
      }
      setSuccess('verify.resent');
    } catch (err: any) {
      setError(verificationMethod === 'telegram' ? 'error.otpSendTelegram' : 'error.otpSendEmail');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6)
      return setError('error.otpRequired');

    if (!signupData) {
      setError('error.signupDataMissing');
      return;
    }

    const sanitizedPhone = signupData.phoneNumber
      ? sanitizePhoneNumber(signupData.phoneNumber)
      : null;
    const payload: any = {
      email: verificationMethod === 'email' ? signupData.email : null,
      phoneNumber: verificationMethod === 'telegram' ? sanitizedPhone : null,
      otp,
      verificationMethod,
    };

    try {
      if (isWebsiteTemplate) {
        payload.storeId = websiteId;
        await verifyCustomerOtpMutation(payload).unwrap();
      } else {
        await verifyOtpMutation(payload).unwrap();
      }

      setSuccess('verify.successRedirect');
      const destination = resolvePostSignupRedirect();
      setTimeout(() => {
        window.location.href = destination;
      }, 1500);
    } catch (err: any) {
      setError('verify.invalidCode');
    }
  };

  const [loginWithTelegramMutation] = useLoginWithTelegramMutation();
  const { data: telegramConfig } = useGetTelegramLoginConfigQuery();
  const telegramEnabled = Boolean(telegramConfig?.enabled);

  useEffect(() => {
    loadTelegramWidget().catch((err) => {
      void err;
    });
  }, []);

  const handleTelegramLogin = async () => {
    if (!telegramConfig?.botId) return;
    setError('');
    setSuccess('');

    try {
      const authData = await requestTelegramAuth(telegramConfig.botId);
      if (!authData) return;
      await loginWithTelegramMutation(authData).unwrap();
      const destination = resolvePostSignupRedirect();
      setSuccess('login.success');
      window.location.assign(destination);
    } catch (err: any) {
      setError('error.telegramLogin');
    }
  };

  return {
    step,
    setStep,
    name: signupData?.name || '',
    email: signupData?.email || '',
    phoneNumber: signupData?.phoneNumber || '',
    password: signupData?.password || '',
    confirmPassword: signupData?.confirmPassword || '',
    otp,
    // error/success hold catalog keys so they follow a language switch.
    error: error && t(error),
    success: success && t(success),
    loading: isSignupCustomerLoading || isSignupLoading,
    domainValid,
    verificationMethod,
    setOtp,
    handleSignup,
    handleResendOtp,
    handleVerifyOtp,
    checkTelegramLink,
    handleTelegramLogin,
    telegramEnabled,
    formatCambodianPhone,
    validateCambodianPhone,
    isWebsiteTemplate,
    isMarketplace,
  };
};
