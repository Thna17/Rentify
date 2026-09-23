
// Updated OrderStatusHeader Component
import { CardHeader } from '@rentify/shared/ui/card';
import { Badge } from '@rentify/shared/ui/badge';
import { 
  CheckCircle, 
  Clock, 
  Package, 
  XCircle 
} from 'lucide-react';
import { motion } from 'framer-motion';

const statusMapping = {
  pending: {
    titleKey: 'confirmation.payment_pending',
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  confirmed: {
    titleKey: 'confirmation.payment_received',
    icon: CheckCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  processing: {
    titleKey: 'confirmation.processing_order',
    icon: Package,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  completed: {
    titleKey: 'confirmation.order_completed',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  cancelled: {
    titleKey: 'confirmation.order_cancelled',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
};

const defaultStatus = {
  titleKey: 'confirmation.order_received',
  icon: Package,
  color: 'text-blue-600',
  bgColor: 'bg-blue-100',
};

export const OrderStatusHeader = ({ order, isDemoOrder, t }) => {
  const statusConfig = order?.status 
    ? statusMapping[order.status] || defaultStatus 
    : defaultStatus;
  
  const IconComponent = statusConfig.icon;

  return (
    <CardHeader className="text-center bg-white py-10 px-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          duration: 0.4,
          delay: 0.1 
        }}
        className="flex justify-center mb-5"
      >
        <div className={`flex items-center justify-center w-20 h-20 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
          <IconComponent className="w-10 h-10" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900 mb-3">
          {isDemoOrder
            ? t('confirmation.demo_prefix', { title: t(statusConfig.titleKey) })
            : t(statusConfig.titleKey)}
        </h1>

        <div className="flex flex-wrap justify-center gap-2">
          <Badge className="font-medium text-sm bg-gray-100 text-gray-700 border border-gray-300">
            {t('confirmation.order_number', { id: order.orderNumber })}
          </Badge>
          {isDemoOrder && (
            <Badge className="font-medium text-sm bg-amber-100 text-amber-700 border border-amber-300">
              {t('confirmation.demo_preview')}
            </Badge>
          )}
        </div>
      </motion.div>
    </CardHeader>
  );
};