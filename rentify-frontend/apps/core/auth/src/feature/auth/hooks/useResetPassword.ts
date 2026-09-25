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
  const [loading, setLoading] = useState(false);
  const [contactMethod, setContactMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const location = useLocation();
  const params = useParams<{ token?: string; storeId?: string }>();
  const { websiteId } = useWebsiteData();
  const { t, isKhmer } = useAuthLanguage();

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

      setSuccess(
        isKhmer
          ? 'ពាក្យសម្ងាត់ត្រូវបានផ្លាស់ប្តូរដោយជោគជ័យ។'
          : 'Your password has been reset successfully.'
      );
      return true;
    } catch (err: any) {
      setError(
        err?.data?.error ||
        err?.data?.message ||
        (isKhmer
          ? 'មិនអាចកំណត់ពាក្យសម្ងាត់ឡើងវិញបានទេ។ សូមពិនិត្យលេខកូដ និងព្យាយាមម្តងទៀត។'
          : 'Failed to reset password. Please check your verification code and try again.')
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError('');

  return {
    error,
    success,
    loading,
    contactMethod,
    email,
    phoneNumber,
    handleResetPassword,
    clearError,
    formatCambodianPhone,
  };
};