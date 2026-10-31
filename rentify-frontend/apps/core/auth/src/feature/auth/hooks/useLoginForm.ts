// hooks/useLoginForm.ts
import { useState, useEffect } from 'react';
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
import {
  useAuthConfig,
  loadTelegramWidget,
  requestTelegramAuth,
  resolveAuthDestination,
} from '../utils/authUtils';
import {
  DASHBOARD_URL,
  ADMIN_DASHBOARD_URL,
  MARKETING_URL,
  MARKETPLACE_URL,
  POS_URL,
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
  const { t } = useAuthLanguage();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [inputMode, setInputMode] = useState<'email' | 'phone'>('email');
  const [needsVerification, setNeedsVerification] = useState(false);

  const { websiteId, userEmail, userPhoneNumber, staffs } = useWebsiteData();

  const authConfig = useAuthConfig();
  const {
    returnDomain,
    redirectUrl,
    hasExplicitReturnUrl,
    adminDashboardHost,
    isWebsiteTemplate,
    isHostedStorefrontBuyer,
  } = authConfig;
  const marketingHost = new URL(MARKETING_URL).host;
  const marketplaceHost = new URL(MARKETPLACE_URL).host;

  const [loginMutation] = useLoginMutation();
  const [loginCustomerMutation] = useLoginCustomerMutation();
  const [loginStaffMutation] = useLoginStaffMutation();
  // const [loginWithGoogleMutation] = useLoginWithGoogleMutation();
  const [loginWithTelegramMutation] = useLoginWithTelegramMutation();
  const { data: telegramConfig } = useGetTelegramLoginConfigQuery();
  const telegramEnabled = Boolean(telegramConfig?.enabled);

  useEffect(() => {
    loadTelegramWidget().catch((err) => {
      void err;
    });
  }, []);

  const handleLogin = async (data: { contact: string; password: string }) => {
    setError('');
    setNeedsVerification(false);
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
          ? 'error.invalidPhone'
          : 'error.invalidEmail'
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

      const userRole = response?.data?.user?.role || parseJwtPayload(response?.data?.accessToken)?.role || 'user';
      const isStaffSuccess = selectedLogin === loginStaffMutation || userRole === 'staff';
      const hasStore = Boolean(response?.data?.hasStore ?? response?.hasStore);
      const destination = resolveAuthDestination({
        hasStore,
        isStaff: isStaffSuccess,
        role: userRole,
        config: authConfig,
      });

      setSuccess('login.success');
      setTimeout(() => {
        window.location.href = destination;
      }, 1500);
    } catch (err: any) {
      // Backend text is only used to pick a catalog message, never shown.
      const rawMsg = err?.data?.error || err?.data?.message || err?.message || '';
      let mappedError = 'error.invalidCredentials';

      const lower = String(rawMsg).toLowerCase();
      if (lower.includes('not verified')) {
        mappedError = 'error.notVerified';
        setNeedsVerification(true);
      } else if (lower.includes('not found') || lower.includes('does not exist')) {
        mappedError = inputMode === 'phone'
          ? 'error.phoneNotFound'
          : 'error.emailNotFound';
      } else if (
        lower.includes('password') ||
        lower.includes('credential') ||
        lower.includes('unauthorized') ||
        lower.includes('invalid email') ||
        lower.includes('invalid phone')
      ) {
        mappedError = 'error.incorrectPassword';
      } else if (
        lower.includes('disabled') ||
        lower.includes('deactivated') ||
        lower.includes('inactive') ||
        lower.includes('suspended')
      ) {
        mappedError = 'error.accountDisabled';
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
      const hasStore = Boolean(response?.data?.hasStore ?? response?.hasStore);
      const userRole = response?.data?.user?.role || parseJwtPayload(response?.data?.accessToken)?.role || 'user';
      const isStaffSuccess = userRole === 'staff';
      const destination = resolveAuthDestination({
        hasStore,
        isStaff: isStaffSuccess,
        role: userRole,
        config: authConfig,
      });
      setSuccess('login.success');
      window.location.assign(destination);
    } catch (err: any) {
      setError('error.telegramLogin');
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

      setSuccess('login.success');
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1500);
    } catch (err: any) {
      setError('error.googleLogin');
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

  // error/success hold catalog keys so they follow a language switch.
  return {
    error: error && t(error),
    success: success && t(success),
    needsVerification,
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
