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
  const { t, isKhmer } = useAuthLanguage();

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
      setError(
        isKhmer
          ? 'សូមបញ្ចូលលេខទូរស័ព្ទ ឬអ៊ីមែលត្រឹមត្រូវ'
          : 'Please enter a valid email or phone number'
      );
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

      setSuccess(
        isKhmer
          ? `ការណែនាំកំណត់ពាក្យសម្ងាត់ថ្មីត្រូវបានផ្ញើទៅកាន់ ${isEmail ? 'អ៊ីមែល' : 'ទូរស័ព្ទ'} របស់អ្នក`
          : `Reset instructions sent to your ${isEmail ? 'email' : 'phone'}`
      );
      return true;
    } catch (err: any) {
      setError(
        err?.data?.error ||
        err?.data?.message ||
        (isKhmer
          ? 'មិនអាចផ្ញើការណែនាំបានទេ។ សូមពិនិត្យព័ត៌មានម្តងទៀត។'
          : 'Failed to send reset instructions. Please try again.')
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    error,
    success,
    loading,
    resetStatus,
    handleRequestReset,
    formatCambodianPhone,
    validateCambodianPhone,
    isWebsiteTemplate: !!websiteId,
  };
};
