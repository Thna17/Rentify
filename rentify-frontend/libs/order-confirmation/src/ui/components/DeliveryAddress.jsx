import { Card } from '@rentify/shared/ui/card';
import { Separator } from '@rentify/shared/ui/separator';
import { motion } from 'framer-motion';
import { 
  Home, 
  Phone, 
  MapPin, 
} from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { DetailItem } from './DetailItem';

export const DeliveryAddress = ({ order, t }) => (
    <Card className="border border-gray-300 shadow-sm p-5">
      <SectionHeader 
        icon={<Home className="w-5 h-5" />} 
        title={t('confirmation.delivery_address')} 
      />
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-2"
      >
        {order?.shippingDetail && (
          <>
            <div className="p-3 bg-blue-50 rounded-lg mb-3 border border-blue-200">
              <h4 className="font-medium text-blue-800">{order.shippingDetail.name}</h4>
            </div>
            
            <DetailItem 
              icon={<Phone className="w-4 h-4" />}
              label={t('confirmation.phone')}
              value={order.shippingDetail.phone}
              copyable
            />
            
            <Separator className="my-3 bg-gray-300" />
            
            <DetailItem 
              icon={<MapPin className="w-4 h-4" />}
              label={t('confirmation.address')}
              value={order.shippingDetail.street}
            />
            
            <div className="pl-7 space-y-1">
              <p className="text-sm text-gray-600">{order.shippingDetail.district}</p>
              <p className="text-sm text-gray-600">{order.shippingDetail.province}</p>
            </div>
          </>
        )}
      </motion.div>
    </Card>
);