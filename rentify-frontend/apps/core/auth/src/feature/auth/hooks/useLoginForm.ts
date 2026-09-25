// hooks/useLoginForm.ts
import { useState } from 'react';
import { useWebsiteData } from '@rentify/shared/context/WebsiteContext';
import {
  useLoginMutation,
  useLoginCustomerMutation,
  useLoginStaffMutation,
  useLoginWithTelegramMutation,
  useGetTelegramLoginConfigQuery,
  // useLoginWithGoogleMutation,
} from '@rentify/apis';
import {
  sanitizePhoneNumber,
  formatCambodianPhone,
  validateCambodianPhone,
} from '../utils/phoneUtils';
import { useAuthConfig } from '../utils/authUtils';
import {
  DASHBOARD_URL,
  MARKETING_URL,
  MARKETPLACE_URL,
} from '@rentify/shared/config/urls';

export const useLoginForm = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputMode, setInputMode] = useState<'email' | 'phone'>('email');

  const { websiteId, userEmail, userPhoneNumber, staffs } = useWebsiteData();

  const { returnDomain, redirectUrl, isWebsiteTemplate, isHostedStorefrontBuyer } = useAuthConfig();
  const marketingHost = new URL(MARKETING_URL).host;
  const marketplaceHost = new URL(MARKETPLACE_URL).host;

  const [loginMutation] = useLoginMutation();
  const [loginCustomerMutation] = useLoginCustomerMutation();
  const [loginStaffMutation] = useLoginStaffMutation();
  // const [loginWithGoogleMutation] = useLoginWithGoogleMutation();
  const [loginWithTelegramMutation] = useLoginWithTelegramMutation();
  // Telegram sign-in covers platform accounts only, not storefront customers.
  const { data: telegramConfig } = useGetTelegramLoginConfigQuery(undefined, {
    skip: isWebsiteTemplate,
  });
  const telegramEnabled = !isWebsiteTemplate && Boolean(telegramConfig?.enabled);

  const handleLogin = async (data: { contact: string; password: string }) => {
    setError('');
    setSuccess('');
    setLoading(true);

    const { contact, password } = data;

    const isEmail =
      inputMode === 'email' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    const isPhone = inputMode === 'phone' && validateCambodianPhone(contact);

    if (!isEmail && !isPhone) {
      setError('Please enter a valid email or phone number');
      setLoading(false);
      return;
    }

    const sanitizedPhone = sanitizePhoneNumber(contact);
    const isSpecialCase =
      (inputMode === 'email' &&
        contact.toLowerCase() === userEmail?.toLowerCase()) ||
      (inputMode === 'phone' && sanitizedPhone === userPhoneNumber);

    const normalizedContact =
      inputMode === 'email' ? contact.toLowerCase() : sanitizedPhone;
    const isStaff =
      Array.isArray(staffs) &&
      staffs.some(
        (staff) =>
          staff.contact.toLowerCase() === normalizedContact.toLowerCase()
      );
    const payload: any = { password };
    if (inputMode === 'email') {
      payload.email = contact;
    } else {
      payload.phoneNumber = sanitizedPhone;
    }

    const loginStrategy = () => {
      if (isSpecialCase || returnDomain === marketingHost || returnDomain === marketplaceHost) return loginMutation;
      if (isStaff) return loginStaffMutation;
      if (isWebsiteTemplate && websiteId) {
        payload.storeId = websiteId;
        return loginCustomerMutation;
      }
      return loginMutation;
    };

    try {
      let selectedLogin = loginStrategy();
      let response: any;
      try {
        response = await selectedLogin(payload).unwrap();
      } catch (firstErr: any) {
        if (selectedLogin === loginCustomerMutation) {
          try {
            response = await loginStaffMutation(payload).unwrap();
            selectedLogin = loginStaffMutation;
          } catch {
            try {
              response = await loginMutation(payload).unwrap();
              selectedLogin = loginMutation;
            } catch {
              throw firstErr;
            }
          }
        } else {
          throw firstErr;
        }
      }

      const isStaffSuccess = selectedLogin === loginStaffMutation || response?.data?.user?.role === "staff";
      const isPlatformLogin =
        isSpecialCase || returnDomain === marketingHost || returnDomain === marketplaceHost || !isWebsiteTemplate || isStaffSuccess;
      let destination = redirectUrl;
      if (isPlatformLogin && returnDomain !== marketplaceHost && !isHostedStorefrontBuyer) {
        destination = response?.data?.hasStore || isStaffSuccess
          ? `${DASHBOARD_URL}/overview`
          : `${MARKETING_URL}/start`;
      }
      setSuccess("Login successful! Redirecting...");
      setTimeout(() => {
        window.location.href = destination;
      }, 1500);
    } catch (err: any) {
      setError(
        err?.data?.error || "Login failed. Please check your credentials"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramLogin = async () => {
    if (!telegramConfig?.botId) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const authData = await requestTelegramAuth(telegramConfig.botId);
      if (!authData) {
        setLoading(false);
        return;
      }
      const response: any = await loginWithTelegramMutation(authData).unwrap();
      const destination =
        returnDomain === marketplaceHost || isHostedStorefrontBuyer
          ? redirectUrl
          : response?.data?.hasStore
          ? `${DASHBOARD_URL}/overview`
          : `${MARKETING_URL}/start`;
      setSuccess('Login successful! Redirecting...');
      setTimeout(() => {
        window.location.href = destination;
      }, 1500);
    } catch (err: any) {
      setError(err?.data?.error || 'Telegram login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // This would typically open Google OAuth popup or redirect
      // For now, we'll simulate the Google login flow
      const googleAuthResponse = await simulateGoogleAuth();

      // const response = await loginWithGoogleMutation({
      //   token: googleAuthResponse.token,
      //   storeId: isWebsiteTemplate ? websiteId : undefined
      // }).unwrap();

      setSuccess('Google login successful! Redirecting...');
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1500);
    } catch (err: any) {
      setError(err?.data?.error || 'Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Simulate Google Auth - Replace with actual Google OAuth implementation
  const simulateGoogleAuth = async () => {
    return new Promise<{ token: string }>((resolve) => {
      // In a real implementation, this would open Google OAuth popup
      setTimeout(() => {
        resolve({ token: 'google-auth-token' });
      }, 1000);
    });
  };

  return {
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
  };
};

// Opens Telegram's login popup and resolves with the signed user payload,
// or null when the user closes it.
const TELEGRAM_WIDGET_SRC = 'https://telegram.org/js/telegram-widget.js?22';

const loadTelegramWidget = () =>
  new Promise<void>((resolve, reject) => {
    if ((window as any).Telegram?.Login) return resolve();
    const script = document.createElement('script');
    script.src = TELEGRAM_WIDGET_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Telegram login'));
    document.head.appendChild(script);
  });

const requestTelegramAuth = async (botId: string) => {
  await loadTelegramWidget();
  return new Promise<Record<string, unknown> | null>((resolve) => {
    (window as any).Telegram.Login.auth(
      { bot_id: botId, request_access: 'write' },
      (data: Record<string, unknown> | false) => resolve(data || null)
    );
  });
};
