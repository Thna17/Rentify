import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Shield, Lock } from 'lucide-react';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { RadioGroup } from '@rentify/shared/ui/radio-group';
import { PaymentMethodCard } from './PaymentMethodCard';

export const PaymentMethodForm = ({ paymentMethod, setPaymentMethod, t }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.5 }}
    className="space-y-8"
  >
    <div className="text-center mb-8">
      <h3 className="text-2xl font-bold mb-2">{t('checkout.choose_payment_method')}</h3>
      <p className="text-muted-foreground">{t('checkout.payment_method_subtitle')}</p>
    </div>

    <RadioGroup
      value={paymentMethod}
      onValueChange={setPaymentMethod}
      className="grid grid-cols-1 gap-6"
    >
      <PaymentMethodCard
        value="COD"
        icon={DollarSign}
        title={t('checkout.cash_on_delivery')}
        subtitle={t('checkout.cash_on_delivery_subtitle')}
        badges={[
          {
            label: t('checkout.secure'),
            color: 'bg-blue-100 text-blue-800',
            icon: Shield,
          },
        ]}
        gradient="bg-gradient-to-br from-green-400 to-green-600"
        isSelected={paymentMethod === 'COD'}
        onClick={() => setPaymentMethod('COD')}
      />

    </RadioGroup>

    <div className="mt-6 p-4 bg-green-50/50 rounded-lg border border-green-200">
      <div className="flex items-center justify-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 bg-green-500 rounded-full">
          <Lock className="w-4 h-4 text-white" />
        </div>
        <p className="text-sm font-medium text-green-800">
          {t('checkout.secure_transaction')}
        </p>
      </div>
    </div>
  </motion.div>
);



export default PaymentMethodForm;
