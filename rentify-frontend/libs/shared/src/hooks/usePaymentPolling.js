import { useState, useEffect, useRef } from 'react';
import { useLazyCheckPaymentStatusQuery } from '@rentify/apis';

const POLL_INTERVAL = 10000;
const MAX_POLLS = 90;

export const usePaymentPolling = ({ 
  paymentMethod, 
  paymentId, 
  isPreview 
}) => {
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [triggerCheckStatus] = useLazyCheckPaymentStatusQuery();
  const pollingCountRef = useRef(0);

  useEffect(() => {
    if (isPreview || paymentMethod !== 'KHQR' || !paymentId) return;

    const pollBakongAPI = async () => {
      try {
        const res = await triggerCheckStatus(paymentId).unwrap();
        if (res.status === 'paid') {
          setPaymentStatus('completed');
          return true;
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
      return false;
    };

    let pollingTimer;

    const startPolling = async () => {
      if (await pollBakongAPI()) return;

      pollingTimer = setInterval(async () => {
        pollingCountRef.current += 1;
        if (pollingCountRef.current >= MAX_POLLS) {
          clearInterval(pollingTimer);
          return;
        }
        if (await pollBakongAPI()) {
          clearInterval(pollingTimer);
        }
      }, POLL_INTERVAL);
    };

    startPolling();

    return () => clearInterval(pollingTimer);
  }, [paymentMethod, paymentId, isPreview, triggerCheckStatus]);

  return paymentStatus;
};

export default usePaymentPolling;
