import { Card, CardContent, CardHeader } from '@rentify/shared/ui/card';
import { motion } from 'framer-motion';
import {
  Truck,
  Clipboard,
  CheckCircle,
  Package,
  XCircle,
  Circle,
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';

// DeliveryProgress Component
export const DeliveryProgress = ({ order, t }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const orderDate = formatDate(order.createdAt);
  const deliveryEstimate = formatDate(
    new Date(order.createdAt).setDate(new Date(order.createdAt).getDate() + 3)
  );

  const getOrderProgress = () => {
    if (order?.status === 'cancelled') {
      return [
        {
          status: t('confirmation.order_cancelled'),
          active: true,
          icon: <XCircle className="w-5 h-5 text-red-500" />,
          description: 'Your order has been cancelled',
        },
      ];
    }

    const steps = [];

    // KHQR Flow
    if (order?.payment?.paymentMethod === 'KHQR') {
      steps.push({
        status:
          order.status === 'pending'
            ? t('confirmation.payment_pending')
            : t('confirmation.payment_received'),
        active: order.status === 'pending',
        completed: order.status !== 'pending',
        icon:
          order.status === 'pending' ? (
            <Clipboard className="w-5 h-5" />
          ) : (
            <CheckCircle className="w-5 h-5" />
          ),
        description:
          order.status === 'pending'
            ? 'Please complete your payment to proceed'
            : 'Payment successfully received',
      });
    }
    // COD Flow
    else if (order?.payment?.paymentMethod === 'COD') {
      steps.push({
        status:
          order.status === 'pending' ? 'Order Confirmed' : 'Order Confirmed',
        active: false,
        completed: true,
        icon: <CheckCircle className="w-5 h-5" />,
        description: 'Your order has been confirmed and is being prepared',
      });
    }

    steps.push({
      status: t('confirmation.processing_order'),
      active: ['confirmed', 'processing'].includes(order?.status),
      completed: order?.status === 'completed',
      icon: <Package className="w-5 h-5" />,
      description:
        order?.status === 'processing'
          ? 'Your order is currently being processed'
          : 'Order will be processed soon',
    });

    steps.push({
      status: t('confirmation.order_completed'),
      active: order?.status === 'completed',
      completed: order?.status === 'completed',
      icon: <CheckCircle className="w-5 h-5" />,
      description:
        order?.status === 'completed'
          ? 'Your order has been completed and delivered'
          : 'Order will be completed and delivered',
    });

    return steps;
  };

  const steps = getOrderProgress();

  return (
    <Card className="border border-gray-300 mb-4 shadow-sm">
      <CardHeader className="pb-4">
        <SectionHeader
          icon={<Truck className="w-5 h-5" />}
          title={t('confirmation.delivery_progress')}
        />
      </CardHeader>

      <CardContent>
        <div className="space-y-5 ">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              <div className="flex items-start gap-4 px-4 pb-4 relative">
                {/* Connecting line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-gray-200" />
                )}

                {/* Step icon */}
                <div
                  className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                    step.completed
                      ? 'border-green-500 bg-green-100 text-green-600'
                      : step.active
                      ? 'border-blue-500 bg-blue-100 text-blue-600'
                      : 'border-gray-300 bg-gray-100 text-gray-400'
                  }`}
                >
                  {step.icon}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3
                      className={`font-medium ${
                        step.completed || step.active
                          ? 'text-gray-900'
                          : 'text-gray-500'
                      }`}
                    >
                      {step.status}
                    </h3>

                    {step.active && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
                        <Circle className="w-2 h-2 fill-current" />
                        {t('confirmation.active')}
                      </div>
                    )}

                    {step.completed && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">
                        <CheckCircle className="w-3 h-3" />
                        Completed
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 mb-1">
                    {step.description}
                  </p>

                  {(step.active || step.completed) && (
                    <p className="text-xs text-gray-500">
                      {step.completed
                        ? orderDate
                        : `Expected: ${deliveryEstimate}`}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
