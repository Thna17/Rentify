import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@rentify/shared/ui/card";
import { Button } from "@rentify/shared/ui/button";
import { Badge } from "@rentify/shared/ui/badge";
import { Clock, Check, X, Scan, Smartphone } from 'lucide-react';
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
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (paymentStatus) {
      case 'processing':
        return t('dashboard.pos.processing_payment');
      case 'completed':
        return t('dashboard.pos.payment_successful');
      case 'failed':
        return t('dashboard.pos.payment_failed');
      default:
        return t('dashboard.pos.waiting_for_payment');
    }
  };

  return (
    <div className=" flex flex-col bg-gray-50">
      {/* Header */}
      <div className="py-6 px-6 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
              <Scan className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {t('dashboard.pos.khqr_payment')}
              </h2>
              <p className="text-sm text-gray-600">Scan to pay with KHQR</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
            <Clock className="h-4 w-4 text-gray-600" />
            <span className="font-semibold text-gray-900">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-gray-100 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col items-center space-y-6">
              
              {/* Payment Status */}
              <div className="w-full text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`}></div>
                  <span className="text-sm font-medium text-gray-700">{getStatusText()}</span>
                </div>
              </div>

              {/* QR Code */}
              <div className="p-4 bg-white border border-gray-100 rounded-lg">
                <KHQRCode rawQR={khqrData?.rawQR} />
              </div>

              {/* Amount Display */}
              <div className="w-full text-center">
                <p className="text-sm font-medium text-gray-600 mb-3">
                  {t('dashboard.pos.amount_to_pay')}
                </p>
                
                <div className="p-4 rounded-lg bg-gray-900 text-white">
                  <p className="text-2xl font-bold">${amount.toFixed(2)}</p>
                </div>
              </div>


              {/* Action Buttons */}
              <div className="w-full pt-4 border-t border-gray-100">
                {paymentStatus === 'completed' ? (
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    <Check className="h-4 w-4 mr-2" />
                    {t('dashboard.pos.payment_successful')}
                  </Button>
                ) : (
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={onCancel}
                      className="flex-1 border-gray-300 text-gray-700"
                    >
                      <X className="h-4 w-4 mr-2" />
                      {t('dashboard.pos.cancel')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="py-4 border-t border-gray-100 bg-white text-center">
        <p className="text-xs text-gray-600">
          Payment will timeout in {formatTime(timeLeft)}
        </p>
      </div>
    </div>
  );
};