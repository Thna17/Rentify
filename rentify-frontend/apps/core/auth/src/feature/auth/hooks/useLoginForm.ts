// hooks/useLoginForm.ts
import { useState } from 'react';
import { useWebsiteData } from '@rentify/shared/context/WebsiteContext';
import { useAuthLanguage } from '../context/AuthLanguageContext';
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
  ADMIN_DASHBOARD_URL,
  MARKETING_URL,
  MARKETPLACE_URL,
} from '@rentify/shared/config/urls';

const parseJwtPayload = (token?: string) => {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export const useLoginForm = () => {
  const { t, isKhmer } = useAuthLanguage();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputMode, setInputMode] = useState<'email' | 'phone'>('email');

  const { websiteId, userEmail, userPhoneNumber, staffs } = useWebsiteData();

  const {
    returnDomain,
    redirectUrl,
    hasExplicitReturnUrl,
    adminDashboardHost,
    isWebsiteTemplate,
    isHostedStorefrontBuyer,
  } = useAuthConfig();
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

    const rawContact = (data.contact || '').trim();
    const { password } = data;

    const isEmail =
      inputMode === 'email' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawContact);
    const isPhone = inputMode === 'phone' && validateCambodianPhone(rawContact);

    if (!isEmail && !isPhone) {
      setError(
        inputMode === 'phone'
          ? t('error.invalidPhone')
          : t('error.invalidEmail')
      );
      setLoading(false);
      return;
    }

    const sanitizedPhone = sanitizePhoneNumber(rawContact);
    const isSpecialCase =
      (inputMode === 'email' &&
        rawContact.toLowerCase() === userEmail?.toLowerCase()) ||
      (inputMode === 'phone' && sanitizedPhone === userPhoneNumber);

    const normalizedContact =
      inputMode === 'email' ? rawContact.toLowerCase() : sanitizedPhone;
    const isStaff =
      Array.isArray(staffs) &&
      staffs.some(
        (staff) =>
          staff.contact.toLowerCase() === normalizedContact.toLowerCase()
      );
    const payload: any = { password };
    if (inputMode === 'email') {
      payload.email = rawContact;
    } else {
      payload.phoneNumber = sanitizedPhone;
    }

    const loginStrategy = () => {
      if (
        isSpecialCase ||
        returnDomain === marketingHost ||
        returnDomain === marketplaceHost ||
        returnDomain === adminDashboardHost
      ) {
        return loginMutation;
      }
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

      const userRole = response?.data?.user?.role || parseJwtPayload(response?.data?.accessToken)?.role;
      const isAdmin = userRole === 'admin';
      const isStaffSuccess = selectedLogin === loginStaffMutation || userRole === 'staff';

      let destination = redirectUrl;

      if (isAdmin) {
        if (hasExplicitReturnUrl && redirectUrl !== `${MARKETING_URL}/start` && redirectUrl !== MARKETING_URL) {
          destination = redirectUrl;
        } else {
          destination = `${ADMIN_DASHBOARD_URL}/admin/dashboard`;
        }
      } else if (hasExplicitReturnUrl) {
        if (returnDomain === adminDashboardHost) {
          destination = response?.data?.hasStore || isStaffSuccess
            ? `${DASHBOARD_URL}/overview`
            : `${MARKETING_URL}/start`;
        } else {
          destination = redirectUrl;
        }
      } else {
        if (isStaffSuccess || response?.data?.hasStore) {
          destination = `${DASHBOARD_URL}/overview`;
        } else if (isWebsiteTemplate) {
          destination = redirectUrl;
        } else {
          destination = `${MARKETING_URL}/start`;
        }
      }

      setSuccess(
        isKhmer
          ? 'ចូលគណនីជោគជ័យ! កំពុងបញ្ជូនបន្ត…'
          : 'Login successful! Redirecting...'
      );
      setTimeout(() => {
        window.location.href = destination;
      }, 1500);
    } catch (err: any) {
      const rawMsg = err?.data?.error || err?.data?.message || err?.message || '';
      let mappedError = rawMsg || t('error.invalidCredentials');

      const lower = String(rawMsg).toLowerCase();
      if (lower.includes('not found') || lower.includes('does not exist')) {
        mappedError = inputMode === 'phone'
          ? t('error.phoneNotFound')
          : t('error.emailNotFound');
      } else if (
        lower.includes('password') ||
        lower.includes('credential') ||
        lower.includes('unauthorized') ||
        lower.includes('invalid email') ||
        lower.includes('invalid phone')
      ) {
        mappedError = t('error.incorrectPassword');
      } else if (
        lower.includes('disabled') ||
        lower.includes('deactivated') ||
        lower.includes('inactive') ||
        lower.includes('suspended')
      ) {
        mappedError = t('error.accountDisabled');
      }

      setError(mappedError);
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
