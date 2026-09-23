import React, { useState, useEffect, useRef } from 'react';
import {
  useInitiateKHQRPaymentMutation,
  useCheckPaymentStatusQuery,
} from '@rentify/apis';
import { Button } from '@rentify/shared/ui/button';
import { Card, CardContent } from '@rentify/shared/ui/card';
import {
  CheckCircle,
  AlertCircle,
  Smartphone,
  Copy,
  RefreshCw,
  Shield,
  Lock,
  Clock,
  ArrowLeft,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useLanguage } from '../../../contexts/LanguageContext';
const KHQRPayment = ({ data, onUpdate, onNext, onBack, amount }) => {
  const [paymentStatus, setPaymentStatus] = useState('idle');
  const [countdown, setCountdown] = useState(0);
  const [isConnected, setIsConnected] = useState(true);
  const [paymentData, setPaymentData] = useState(null);
  const hasInitiated = useRef(false); 
  const { language, t } = useLanguage();
  const isLanguageKh = language === 'KH';

  // RTK Query hooks
  const [initiatePayment, { isLoading: isInitiating }] =
    useInitiateKHQRPaymentMutation();
  const { data: statusData, refetch } = useCheckPaymentStatusQuery(
    paymentData?.paymentId,
    {
      skip: !paymentData?.paymentId || paymentStatus !== 'pending',
      pollingInterval: paymentStatus === 'pending' ? 5000 : 0,
    }
  );

  // Initialize payment
  useEffect(() => {
    if (amount > 0 && paymentStatus === 'idle' && !hasInitiated.current) {
      hasInitiated.current = true; // Prevent multiple calls
      handleInitiatePayment();
    }
  }, [amount, paymentStatus]);

  // Handle payment status updates
  useEffect(() => {
    if (!statusData) return;

    switch (statusData.status) {
      case 'completed':
        handlePaymentSuccess(statusData);
        break;
      case 'expired':
        setPaymentStatus('expired');
        break;
      case 'failed':
        setPaymentStatus('failed');
        break;
      default:
        // Update countdown from backend
        if (statusData.expiresAt) {
          const remaining = Math.max(
            0,
            Math.floor((new Date(statusData.expiresAt) - new Date()) / 1000)
          );
          setCountdown(remaining);
        }
    }
  }, [statusData]);

  // Handle network status
  useEffect(() => {
    const handleConnectionChange = () => {
      const connected = navigator.onLine;
      setIsConnected(connected);
      if (connected && paymentStatus === 'pending') refetch();
    };

    window.addEventListener('online', handleConnectionChange);
    window.addEventListener('offline', handleConnectionChange);

    return () => {
      window.removeEventListener('online', handleConnectionChange);
      window.removeEventListener('offline', handleConnectionChange);
    };
  }, [paymentStatus]);

  // Initiate payment
  const handleInitiatePayment = async () => {
    setPaymentStatus('initiating');
    try {
      const response = await initiatePayment({ amount }).unwrap();
      setPaymentData({
        paymentId: response.paymentId,
        expiresAt: response.expiresAt,
        rawQR: response.rawQR,
      });
      setCountdown(
        Math.floor((new Date(response.expiresAt) - new Date()) / 1000)
      );
      setPaymentStatus('pending');
    } catch (error) {
      console.error('Payment initiation failed:', error);
      setPaymentStatus('failed');
    }
  };

  // Handle successful payment
  const handlePaymentSuccess = (payment) => {
    setPaymentStatus('success');
    onUpdate({
      payment: {
        status: 'completed',
        paymentId: payment.id,
        transactionId: payment.transactionId,
        method: 'khqr',
      },
    });
    setTimeout(() => onNext(), 2000);
  };

  // Refresh QR code
  const handleRefreshQR = () => {
    hasInitiated.current = false;
    setPaymentStatus('idle');
    setPaymentData(null);
    handleInitiatePayment();
  };

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRetry = () => {
    setPollingCount(0);
    setPaymentStatus('pending');
    refetchStatus();
  };

  //   const handleRefreshQR = () => {
  //     if (pollingIntervalRef.current) {
  //       clearInterval(pollingIntervalRef.current);
  //     }

  //     setPollingCount(0);
  //     setCountdown(300);
  //     setPaymentStatus('idle');
  //     handleInitiatePayment();
  //   };

  const copyQRData = async () => {
    try {
      // This would be the deep link URL from backend response
      await navigator.clipboard.writeText(
        statusData?.transactionData?.qrCodeUrl || ''
      );
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy QR data:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6 text-center">
            <WifiOff className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3
              className={`text-xl font-bold text-red-700 mb-2 ${
                isLanguageKh ? 'font-khmer' : ''
              }`}
            >
              {isLanguageKh
                ? 'គ្មានការតភ្ជាប់អ៊ីនធឺណិត'
                : 'No Internet Connection'}
            </h3>
            <p
              className={`text-red-600 mb-4 ${
                isLanguageKh ? 'font-khmer' : ''
              }`}
            >
              {isLanguageKh
                ? 'សូមពិនិត្យមើលការតភ្ជាប់អ៊ីនធឺណិតរបស់អ្នក ហើយព្យាយាមម្តងទៀត'
                : 'Please check your internet connection and try again'}
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              {isLanguageKh ? 'ព្យាយាមម្តងទៀត' : 'Retry'}
            </Button>
          </CardContent>
        </Card>
        <Button onClick={onBack} variant="outline" className="w-full">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {isLanguageKh ? 'ត្រលប់ក្រោយ' : 'Go Back'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2
          className={`text-2xl font-bold text-gray-900 mb-2 ${
            isLanguageKh ? 'font-khmer' : ''
          }`}
        >
          {isLanguageKh ? 'ទូទាត់ជាមួយ KHQR' : 'Pay with KHQR'}
        </h2>
        <p className={`text-gray-600 ${isLanguageKh ? 'font-khmer' : ''}`}>
          {isLanguageKh
            ? 'ស្កែន QR code ដើម្បីបញ្ចប់ការទូទាត់របស់អ្នក'
            : 'Scan the QR code to complete your payment'}
        </p>
      </div>

      {/* QR Code Display */}
      <Card className="relative">
        <CardContent className="p-8 text-center">
          {paymentStatus === 'timeout' ? (
            <div className="space-y-4">
              <Clock className="w-16 h-16 text-orange-500 mx-auto" />
              <h3
                className={`text-xl font-bold text-orange-700 ${
                  isLanguageKh ? 'font-khmer' : ''
                }`}
              >
                {isLanguageKh ? 'QR code បានផុតកំណត់' : 'QR Code Expired'}
              </h3>
              <p
                className={`text-gray-600 ${isLanguageKh ? 'font-khmer' : ''}`}
              >
                {isLanguageKh
                  ? 'សូមបង្កើត QR code ថ្មីម្តងទៀត'
                  : 'Please generate a new QR code'}
              </p>
              <Button
                onClick={handleRefreshQR}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {isLanguageKh ? 'បង្កើតថ្មី' : 'Generate New'}
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <div className="inline-block p-4 bg-white rounded-lg shadow-lg border-2 border-gray-200">
                  {paymentStatus === 'pending' &&
                  statusData?.transactionData?.rawQR ? (
                    <QRCodeSVG
                      value={statusData.transactionData.rawQR}
                      size={200}
                      level="M"
                      includeMargin={true}
                      className="block"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center">
                      {isInitiating ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
                      ) : (
                        <Smartphone className="w-16 h-16 text-gray-300" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Timer */}
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Clock className="w-4 h-4 text-gray-500" />
                <span
                  className={`text-sm text-gray-600 ${
                    isLanguageKh ? 'font-khmer' : ''
                  }`}
                >
                  {isLanguageKh ? 'ផុតកំណត់ក្នុងរយៈពេល: ' : 'Expires in: '}
                  <span className="font-mono font-bold">
                    {formatTime(countdown)}
                  </span>
                </span>
              </div>

              {/* Amount Display */}
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <p
                  className={`text-sm text-blue-700 ${
                    isLanguageKh ? 'font-khmer' : ''
                  }`}
                >
                  {isLanguageKh ? 'ចំនួនទឹកប្រាក់' : 'Amount to Pay'}
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  ${amount.toFixed(2)}
                </p>
              </div>

              {/* Copy Link Button */}
              {statusData?.transactionData?.qrCodeUrl && (
                <Button
                  onClick={copyQRData}
                  variant="outline"
                  size="sm"
                  className="mb-4"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  {isLanguageKh ? 'ចម្លងតំណ' : 'Copy Link'}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Status */}
      {paymentStatus === 'initiating' && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3
              className={`text-lg font-bold text-blue-700 mb-2 ${
                isLanguageKh ? 'font-khmer' : ''
              }`}
            >
              {isLanguageKh
                ? 'កំពុងបង្កើត QR code...'
                : 'Generating QR code...'}
            </h3>
          </CardContent>
        </Card>
      )}

      {paymentStatus === 'pending' && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <h3
                className={`text-lg font-bold text-blue-700 ${
                  isLanguageKh ? 'font-khmer' : ''
                }`}
              >
                {isLanguageKh
                  ? 'កំពុងរង់ចាំការទូទាត់...'
                  : 'Waiting for payment...'}
              </h3>
            </div>
            <p className={`text-blue-600 ${isLanguageKh ? 'font-khmer' : ''}`}>
              {isLanguageKh
                ? 'សូមបញ្ចប់ការទូទាត់នៅក្នុងកម្មវិធីធនាគាររបស់អ្នក'
                : 'Please complete the payment in your banking app'}
            </p>
          </CardContent>
        </Card>
      )}

      {paymentStatus === 'success' && statusData && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3
              className={`text-xl font-bold text-green-700 mb-2 ${
                isLanguageKh ? 'font-khmer' : ''
              }`}
            >
              {isLanguageKh ? 'ការទូទាត់ជោគជ័យ!' : 'Payment Successful!'}
            </h3>
            <p
              className={`text-green-600 mb-4 ${
                isLanguageKh ? 'font-khmer' : ''
              }`}
            >
              {isLanguageKh
                ? 'ការទូទាត់របស់អ្នកត្រូវបានដំណើរការដោយជោគជ័យ'
                : 'Your payment has been processed successfully'}
            </p>
            <div className="bg-white rounded-lg p-3 mb-4">
              <p
                className={`text-xs text-gray-600 mb-1 ${
                  isLanguageKh ? 'font-khmer' : ''
                }`}
              >
                {isLanguageKh ? 'លេខប្រតិបត្តិការ:' : 'Transaction ID:'}
              </p>
              <p className="font-mono text-sm text-gray-900">{statusData.id}</p>
            </div>
            <Button
              onClick={onNext}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLanguageKh ? 'បន្ត' : 'Continue'}
            </Button>
          </CardContent>
        </Card>
      )}

      {paymentStatus === 'failed' && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3
              className={`text-xl font-bold text-red-700 mb-2 ${
                isLanguageKh ? 'font-khmer' : ''
              }`}
            >
              {isLanguageKh ? 'ការទូទាត់បរាជ័យ' : 'Payment Failed'}
            </h3>
            <p
              className={`text-red-600 mb-4 ${
                isLanguageKh ? 'font-khmer' : ''
              }`}
            >
              {isLanguageKh
                ? 'សូមពិនិត្យមើលសមតុល្យគណនី ឬព្យាយាមម្តងទៀត'
                : 'Please check your account balance or try again'}
            </p>
            <div className="space-y-2">
              <Button onClick={handleRetry} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                {isLanguageKh ? 'ព្យាយាមម្តងទៀត' : 'Try Again'}
              </Button>
              <Button onClick={onBack} variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {isLanguageKh ? 'ប្តូរវិធីទូទាត់' : 'Change Payment Method'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Assurance */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-center space-x-6">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-xs text-gray-700">SSL Encrypted</span>
            </div>
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-green-600" />
              <span className="text-xs text-gray-700">Secure Payment</span>
            </div>
            <div className="flex items-center space-x-2">
              <Wifi className="w-4 h-4 text-green-600" />
              <span className="text-xs text-gray-700">Real-time</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      {paymentStatus === 'pending' && (
        <div className="flex space-x-4">
          <Button onClick={onBack} variant="outline" className="flex-1">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {isLanguageKh ? 'ត្រលប់ក្រោយ' : 'Back'}
          </Button>
          <Button
            onClick={handleRefreshQR}
            className="flex-1"
            variant="secondary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {isLanguageKh ? 'ផ្លាស់ប្តូរ QR' : 'Refresh QR'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default KHQRPayment;
