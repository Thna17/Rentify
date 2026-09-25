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
} from '@rentify/apis';
import {
  sanitizePhoneNumber,
  formatCambodianPhone,
  validateCambodianPhone,
} from '../utils/phoneUtils';
import { useAuthConfig } from '../utils/authUtils';

export const useSignupForm = () => {
  const { t, isKhmer } = useAuthLanguage();
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

  const { redirectUrl, isWebsiteTemplate, isMarketplace } = useAuthConfig();

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
        setSuccess('Telegram linked successfully!');
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

    if (!cleanName) return setError(isKhmer ? 'សូមបញ្ចូលឈ្មោះពេញរបស់អ្នក' : 'Please enter your full name');
    if (!isEmail && !isPhone) {
      return setError(
        inputMode === 'phone' ? t('error.invalidPhone') : t('error.invalidEmail')
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
      setSuccess(
        method === 'telegram'
          ? (isKhmer
              ? 'សូមភ្ជាប់គណនី Telegram របស់អ្នកដើម្បីទទួលលេខកូដ OTP'
              : 'Please link your Telegram account to receive OTP')
          : (isKhmer
              ? 'លេខកូដ OTP ត្រូវបានផ្ញើ។ សូមពិនិត្យអ៊ីមែលរបស់អ្នក។'
              : 'OTP sent. Please check your email.')
      );
    } catch (err: any) {
      const rawMsg = err?.data?.error || err?.data?.message || err?.message || '';
      let mappedError = rawMsg || (isKhmer ? 'ការចុះឈ្មោះមិនជោគជ័យ' : 'Signup failed');
      const lower = String(rawMsg).toLowerCase();
      if (
        lower.includes('already exists') ||
        lower.includes('in use') ||
        lower.includes('duplicate')
      ) {
        mappedError =
          inputMode === 'phone'
            ? (isKhmer
                ? 'លេខទូរស័ព្ទនេះត្រូវបានចុះឈ្មោះរួចហើយ។ សូមចូលគណនី ឬប្រើលេខផ្សេង។'
                : 'This phone number is already registered. Please sign in or use another number.')
            : (isKhmer
                ? 'អ៊ីមែលនេះត្រូវបានចុះឈ្មោះរួចហើយ។ សូមចូលគណនី ឬប្រើអ៊ីមែលផ្សេង។'
                : 'This email address is already registered. Please sign in or use another email.');
      }
      setError(mappedError);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setSuccess('');

    if (!signupData) {
      setError('No signup data found');
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
      setSuccess('OTP resent successfully.');
    } catch (err: any) {
      setError(
        err?.data?.error ||
          (verificationMethod === 'telegram'
            ? 'Telegram OTP send failed. Is your Telegram linked?'
            : 'Email OTP send failed.')
      );
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6)
      return setError(t('error.otpRequired'));

    if (!signupData) {
      setError(isKhmer ? 'រកមិនឃើញទិន្នន័យចុះឈ្មោះទេ' : 'No signup data found');
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

      setSuccess(
        isKhmer
          ? 'ការផ្ទៀងផ្ទាត់ជោគជ័យ! កំពុងបញ្ជូនបន្ត…'
          : 'Verification successful! Redirecting...'
      );
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1500);
    } catch (err: any) {
      setError(
        err?.data?.error ||
          (isKhmer ? 'លេខកូដសម្ងាត់ OTP មិនត្រឹមត្រូវ ឬផុតកំណត់' : 'Invalid or expired OTP')
      );
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
    error,
    success,
    loading: isSignupCustomerLoading || isSignupLoading,
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
  };
};
