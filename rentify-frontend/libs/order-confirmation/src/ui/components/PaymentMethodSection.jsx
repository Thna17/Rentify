import React from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';
import { Separator } from '@rentify/shared/ui/separator';
import { KHQRCode } from '@rentify/shared/ui/components/KHQRCode';
import {
  Wallet,
  Truck,
  DollarSign,
  CheckCircle,
  Download,
  ExternalLink,
  QrCode,
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';

// CODSection Component
const CODSection = ({ order, t }) => {
  const getCurrencySymbol = (currency) => {
    return currency === 'KHR' ? '៛' : '$';
  };

  return (
    <Card className="border border-gray-300 shadow-sm">
      <CardHeader className="text-center pb-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex justify-center mb-3"
        >
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 text-amber-600">
            <Wallet className="w-7 h-7" />
          </div>
        </motion.div>

        <CardTitle className="text-lg font-semibold text-gray-900">
          {t('confirmation.cash_on_delivery')}
        </CardTitle>
        <CardDescription className="text-gray-600">
          {t('confirmation.cash_on_delivery_subtitle')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="text-center">
          <motion.div
            animate={{ y: [-5, 5, -5] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-block"
          >
            <Truck className="w-16 h-16 text-blue-500 mx-auto" />
          </motion.div>
        </div>

        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-amber-600" />
            <h4 className="font-medium text-amber-800">
              {t('confirmation.prepare_exact_cash')}
            </h4>
          </div>
          <p className="text-sm text-amber-700">
            {t('confirmation.prepare_cash_amount', {
              amount: `${getCurrencySymbol(order.currency)}${
                order.totalAmount
              }`,
            })}
          </p>
        </div>

        {/* <Separator className="bg-gray-200" />

        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Shield className="w-4 h-4 text-green-500" />
          <span className="text-sm">
            {t('confirmation.secure_transaction')}
          </span>
        </div> */}
      </CardContent>
    </Card>
  );
};

// KHQRSection Component
const KHQRSection = ({ order, paymentStatus, t }) => {
  const qrCanvasId = `qr-canvas-${order.id}`;
  const getCurrencySymbol = (currency) => {
    return currency === 'KHR' ? '៛' : '$';
  };

  return (
    <Card className="border border-gray-300 mb-4 shadow-sm">
      {paymentStatus === 'pending' ? (
        <>
          <CardHeader className="pb-4">
            <SectionHeader
              icon={<QrCode className="w-5 h-5" />}
              title={t('confirmation.khqr_payment')}
            />
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="text-center">
              <KHQRCode
                rawQR={order.payment.rawQR}
                currency={order.currency}
                qrCanvasId={qrCanvasId}
              />

              <div className="flex flex-wrap flex-col sm:flex-row gap-3 justify-center mt-5">
                <Button variant="outline" className="gap-2 border-gray-300">
                  <Download className="w-4 h-4" />
                  {t('confirmation.download_qr')}
                </Button>
                <Button className="gap-2 bg-gray-900 text-white hover:bg-gray-800">
                  {t('confirmation.pay_with_bakong')}
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Separator className="bg-gray-200" />

            {/* <div className="flex items-center justify-center gap-2 text-gray-500">
              <Shield className="w-4 h-4 text-green-500" />
              <span className="text-sm">{t('confirmation.pci_compliant')}</span>
            </div> */}
          </CardContent>
        </>
      ) : (
        <CardContent className="text-center py-6">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex justify-center mb-5"
          >
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600">
              <CheckCircle className="w-8 h-8" />
            </div>
          </motion.div>

          <CardTitle className="mb-3 text-gray-900">
            {t('confirmation.payment_confirmed')}
          </CardTitle>
          <CardDescription className="max-w-md mx-auto mb-6 text-gray-600">
            {t('confirmation.payment_confirmed_message', {
              amount: `${getCurrencySymbol(order.currency)}${
                order.totalAmount
              }`,
            })}
          </CardDescription>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {[
              {
                label: t('confirmation.transaction_id'),
                value: order.payment.id.slice(0, 8) + '...',
              },
              {
                label: t('confirmation.payment_method'),
                value: t('confirmation.khqr_payment'),
              },
            ].map((item, index) => (
              <div key={index} className="p-3 bg-gray-100 rounded-md">
                <p className="text-xs text-gray-600 mb-1">{item.label}</p>
                <p className="font-medium text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

// PaymentMethodSection Component
export const PaymentMethodSection = ({ order, paymentStatus, t }) => {
  if (order?.status === 'cancelled') return null;

  return order?.payment?.paymentMethod === 'COD' ? (
    <CODSection order={order} t={t} />
  ) : (
    <KHQRSection order={order} paymentStatus={paymentStatus} t={t} />
  );
};
