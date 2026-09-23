import { Card } from '@rentify/shared/ui/card';
import { Separator } from '@rentify/shared/ui/separator';
import { Badge } from '@rentify/shared/ui/badge';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Copy,
  Calendar
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { DetailItem } from './DetailItem';

export const PaymentDetails = ({ order, t }) => (
    <Card className="border border-gray-300 shadow-sm p-5">
      <SectionHeader 
        icon={<CreditCard className="w-5 h-5" />} 
        title={t('confirmation.payment_details')} 
      />
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="space-y-4"
      >
        <div className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
          <Badge className="font-medium bg-blue-100 text-blue-700 border border-blue-300">
            {order.payment.paymentMethod === 'COD' 
              ? t('confirmation.cod_payment')
              : t('confirmation.khqr_payment')
            }
          </Badge>
          
          <Badge className={
            order.status === 'completed' ? 'bg-green-100 text-green-700 border border-green-200' :
            order.status === 'pending' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
            'bg-gray-100 text-gray-700 border border-gray-300'
          }>
            {t(`confirmation.status_${order.status}`)}
          </Badge>
        </div>
        
        <Separator className="bg-gray-300" />
        
        <DetailItem 
          icon={<Calendar className="w-4 h-4" />}
          label={t('confirmation.payment_date')}
          value={new Date(order.createdAt).toLocaleString()}
        />
        
        <DetailItem 
          icon={<Copy className="w-4 h-4" />}
          label={t('confirmation.transaction_id')}
          value={`${order?.payment?.id?.slice(0, 8)}...${order?.payment?.id?.slice(-8)}`}
          copyable
        />
        
        <DetailItem 
          icon={<CreditCard className="w-4 h-4" />}
          label={t('confirmation.amount')}
          value={`${order.currency === 'KHR' ? '៛' : '$'}${order.totalAmount}`}
        />
      </motion.div>
    </Card>
);