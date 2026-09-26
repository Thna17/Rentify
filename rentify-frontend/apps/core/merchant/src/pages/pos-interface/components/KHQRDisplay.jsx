import React, { useState, useEffect } from 'react';
import { Button } from '@rentify/shared/ui/button';
import { Clock, Check, X, Scan } from 'lucide-react';
import { useTranslation } from '@rentify/utils';
import { KHQRCode } from '@rentify/shared/ui/components/KHQRCode';

export const KHQRDisplay = ({ amount, onCancel, khqrData, paymentStatus, isMobile }) => {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState(300);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onCancel?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onCancel]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    switch (paymentStatus) {
      case 'processing':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-amber-500';
    }
  };

  const getStatusText = () => {
    switch (paymentStatus) {
      case 'processing':
        return t('dashboard.pos.processing_payment', 'Processing Payment...');
      case 'completed':
        return t('dashboard.pos.payment_successful', 'Payment Successful!');
      case 'failed':
        return t('dashboard.pos.payment_failed', 'Payment Failed');
      default:
        return t('dashboard.pos.waiting_for_payment', 'Waiting for payment...');
    }
  };

  return (
    <div className="flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="py-4 px-6 border-b border-gray-100 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center shadow-sm">
            <Scan className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">
              {t('dashboard.pos.khqr_payment', 'KHQR Payment')}
            </h2>
            <p className="text-xs text-gray-500">Scan to pay with KHQR</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
          <Clock className="h-3.5 w-3.5 text-gray-600" />
          <span className="font-semibold text-sm text-gray-900 tabular-nums">
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 flex flex-col items-center space-y-5 bg-white">
        {/* Payment Status Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs font-medium text-gray-700">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`} />
          <span>{getStatusText()}</span>
        </div>

        {/* Authentic KHQR Stand Card */}
        <div className="my-1">
          <KHQRCode
            rawQR={khqrData?.rawQR}
            size={180}
            showBrand={true}
          />
        </div>

        {/* Amount Display */}
        <div className="w-full text-center">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
            {t('dashboard.pos.amount_to_pay', 'Amount to Pay')}
          </p>
          <div className="py-3 px-4 rounded-xl bg-gray-900 text-white font-bold text-2xl tracking-tight shadow-sm">
            ${Number(amount || 0).toFixed(2)}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full pt-1">
          {paymentStatus === 'completed' ? (
            <Button className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium shadow-sm transition-colors">
              <Check className="h-4 w-4 mr-2" />
              {t('dashboard.pos.payment_successful', 'Payment Successful!')}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={onCancel}
              className="w-full py-2.5 rounded-xl border-gray-300 hover:bg-gray-100 text-gray-700 font-medium transition-colors"
            >
              <X className="h-4 w-4 mr-2" />
              {t('dashboard.pos.cancel_payment', t('dashboard.pos.cancel', 'Cancel Payment'))}
            </Button>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="py-3 border-t border-gray-100 bg-gray-50 text-center">
        <p className="text-xs text-gray-500">
          Payment will timeout in {formatTime(timeLeft)}
        </p>
      </div>
    </div>
  );
};