// src/hooks/useResetPassword.ts
import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useWebsiteData } from '@rentify/shared/context/WebsiteContext';
import {
  useResetPasswordMutation,
  useResetPasswordCustomerMutation,
} from '@rentify/apis';
import { 
  formatCambodianPhone, 
} from '../utils/phoneUtils';
import { useAuthLanguage } from '../context/AuthLanguageContext';

export const useResetPassword = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tokenInvalid, setTokenInvalid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [contactMethod, setContactMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const location = useLocation();
  const params = useParams<{ token?: string; storeId?: string }>();
  const { websiteId } = useWebsiteData();
  const { t } = useAuthLanguage();

  const [resetPasswordMutation] = useResetPasswordMutation();
  const [resetPasswordCustomerMutation] = useResetPasswordCustomerMutation();

  useEffect(() => {
    if (location.state?.contactMethod) {
      setContactMethod(location.state.contactMethod);
      if (location.state.contactMethod === 'email') {
        setEmail(location.state.contact || '');
      } else {
        setPhoneNumber(location.state.contact || '');
      }
    }
  }, [location]);

  const handleResetPassword = async (token: string, password: string): Promise<boolean> => {
    setError('');
    setSuccess('');
    setTokenInvalid(false);
    setLoading(true);

    try {
      const payload: any = {
        token: token.trim(),
        password,
      };

      const effectiveStoreId = websiteId || params.storeId;
      if (effectiveStoreId) {
        payload.storeId = effectiveStoreId;
        await resetPasswordCustomerMutation(payload).unwrap();
      } else {
        await resetPasswordMutation(payload).unwrap();
      }

      setSuccess('reset.success');
      return true;
    } catch (err: any) {
      // Backend text is only used to pick a catalog message, never shown.
      const raw = String(err?.data?.error || err?.data?.message || '');
      const invalid = /expired|invalid|token|not found|malformed|used/i.test(raw);
      setTokenInvalid(invalid);
      setError(invalid ? 'reset.invalidTokenMessage' : 'error.resetFailed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError('');

  // error/success hold catalog keys so they follow a language switch.
  return {
    error: error && t(error),
    success: success && t(success),
    tokenInvalid,
    loading,
    contactMethod,
    email,
    phoneNumber,
    handleResetPassword,
    clearError,
    formatCambodianPhone,
  };
};