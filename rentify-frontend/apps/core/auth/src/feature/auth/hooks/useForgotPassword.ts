// src/hooks/useForgotPassword.ts
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

export const useForgotPassword = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { websiteId } = useWebsiteData();

  const [forgotPasswordMutation] = useForgotPasswordMutation();
  const [forgotPasswordCustomerMutation] = useForgotPasswordCustomerMutation();

  const handleRequestReset = async (contact: string) => {
    setError('');
    setSuccess('');
    setLoading(true);

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    const isPhone = validateCambodianPhone(contact);

    if (!isEmail && !isPhone) {
      setError('Please enter a valid email or phone number');
      setLoading(false);
      return;
    }

    try {
      const payload: any = {
        email: isEmail ? contact : null,
        phoneNumber: isPhone ? sanitizePhoneNumber(contact) : null,
      };

      const response = websiteId
        ? await forgotPasswordCustomerMutation({ ...payload, storeId: websiteId }).unwrap()
        : await forgotPasswordMutation(payload).unwrap();

      setSuccess(`Reset instructions sent to your ${isEmail ? 'email' : 'phone'}`);
      
      // Redirect to reset page after 2 seconds
      setTimeout(() => {
        navigate('/reset-password', { 
          state: { 
            contactMethod: isEmail ? 'email' : 'phone',
            contact: contact
          }
        });
      }, 2000);
    } catch (err: any) {
      setError(
        err?.data?.error ||
        `Failed to send reset instructions. Please try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    error,
    success,
    loading,
    handleRequestReset,
    formatCambodianPhone,
    validateCambodianPhone,
    isWebsiteTemplate: !!websiteId,
  };
};
