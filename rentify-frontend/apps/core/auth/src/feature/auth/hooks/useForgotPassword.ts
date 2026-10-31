// src/hooks/useForgotPassword.ts
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useWebsiteData } from '@rentify/shared/context/WebsiteContext';
import {
  useForgotPasswordMutation,
  useForgotPasswordCustomerMutation,
} from '@rentify/apis';
import { 
  sanitizePhoneNumber, 
  formatCambodianPhone, 
  validateCambodianPhone 
} from '../utils/phoneUtils';
import { useAuthLanguage } from '../context/AuthLanguageContext';

export const useForgotPassword = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const { websiteId } = useWebsiteData();
  const { t } = useAuthLanguage();

  const [forgotPasswordMutation] = useForgotPasswordMutation();
  const [forgotPasswordCustomerMutation] = useForgotPasswordCustomerMutation();

  const resetStatus = () => {
    setError('');
    setSuccess('');
  };

  const handleRequestReset = async (contact: string): Promise<boolean> => {
    setError('');
    setSuccess('');
    setLoading(true);

    const cleanContact = (contact || '').trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanContact);
    const isPhone = validateCambodianPhone(cleanContact);

    if (!isEmail && !isPhone) {
      setError('error.invalidContact');
      setLoading(false);
      return false;
    }

    try {
      const payload: any = {
        email: isEmail ? cleanContact : null,
        phoneNumber: isPhone ? sanitizePhoneNumber(cleanContact) : null,
      };

      if (websiteId) {
        await forgotPasswordCustomerMutation({ ...payload, storeId: websiteId }).unwrap();
      } else {
        await forgotPasswordMutation(payload).unwrap();
      }

      setSuccess(isEmail ? 'forgot.sentEmail' : 'forgot.sentPhone');
      return true;
    } catch (err: any) {
      setError('error.resetSendFailed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // error/success hold catalog keys so they follow a language switch.
  return {
    error: error && t(error),
    success: success && t(success),
    loading,
    resetStatus,
    handleRequestReset,
    formatCambodianPhone,
    validateCambodianPhone,
    isWebsiteTemplate: !!websiteId,
  };
};
