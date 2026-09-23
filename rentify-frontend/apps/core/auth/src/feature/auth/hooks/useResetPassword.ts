// src/hooks/useResetPassword.ts
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useWebsiteData } from '@rentify/shared/context/WebsiteContext';
import {
  useResetPasswordMutation,
  useResetPasswordCustomerMutation,
} from '@rentify/apis';
import { 
  formatCambodianPhone, 
} from '../utils/phoneUtils';

export const useResetPassword = () => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [contactMethod, setContactMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const { websiteId } = useWebsiteData();

  const [resetPasswordMutation] = useResetPasswordMutation();
  const [resetPasswordCustomerMutation] = useResetPasswordCustomerMutation();

  useEffect(() => {
    if (location.state?.contactMethod) {
      setContactMethod(location.state.contactMethod);
      if (location.state.contactMethod === 'email') {
        setEmail(location.state.contact);
      } else {
        setPhoneNumber(location.state.contact);
      }
    }
  }, [location]);

  const handleResetPassword = async (token: string, password: string) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload: any = {
        token,
        password,
      };

      if (websiteId) {
        payload.storeId = websiteId;
        await resetPasswordCustomerMutation(payload).unwrap();
      } else {
        await resetPasswordMutation(payload).unwrap();
      }

      setSuccess('Password reset successfully! Redirecting to login...');
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err?.data?.error || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return {
    error,
    success,
    loading,
    contactMethod,
    email,
    phoneNumber,
    handleResetPassword,
    formatCambodianPhone,
  };
};