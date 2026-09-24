// hooks/useLoginForm.ts
import { useState } from 'react';
import { useWebsiteData } from '@rentify/shared/context/WebsiteContext';
import {
  useLoginMutation,
  useLoginCustomerMutation,
  useLoginStaffMutation,
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
      if (isWebsiteTemplate && isStaff) return loginStaffMutation;
      if (isWebsiteTemplate) {
        payload.storeId = websiteId;
        return loginCustomerMutation;
      }
      return loginMutation;
    };

    try {
      const selectedLogin = loginStrategy();
      const response = await selectedLogin(payload).unwrap();
      const isPlatformLogin =
        isSpecialCase || returnDomain === marketingHost || returnDomain === marketplaceHost || !isWebsiteTemplate;
      let destination = redirectUrl;
      if (isPlatformLogin && returnDomain !== marketplaceHost && !isHostedStorefrontBuyer) {
        destination = response?.data?.hasStore
          ? `${DASHBOARD_URL}/overview`
          : `${MARKETING_URL}/start`;
      }
      setSuccess('Login successful! Redirecting...');
      setTimeout(() => {
        window.location.href = destination;
      }, 1500);
    } catch (err: any) {
      setError(
        err?.data?.error || 'Login failed. Please check your credentials'
      );
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
    formatCambodianPhone,
    validateCambodianPhone,
    isWebsiteTemplate,
  };
};
