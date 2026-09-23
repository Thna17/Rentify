import {
  Card,
  CardContent,
  CardHeader,
} from '@rentify/shared/ui/card';
import { Separator } from '@rentify/shared/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@rentify/shared/ui/avatar';
import { Badge } from '@rentify/shared/ui/badge';
import { ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { SectionHeader } from './SectionHeader';
export const OrderSummary = ({ order, t }) => (
  <Card className="border border-gray-300 mb-4 shadow-sm">
    <CardHeader className="pb-4">
      <SectionHeader
        icon={<ShoppingBag className="w-5 h-5" />}
        title={t('confirmation.order_summary')}
      />
    </CardHeader>
    <CardContent className="space-y-6">
      {order?.OrderItems?.map((item, index) => {
        const product = item.Product || {};
        const imageUrl = product.images?.[0]?.url || product.image;

        return (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.3 }}
        >
          <div className="flex gap-4 px-4 pb-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
            <Avatar className="w-16 h-16 rounded-lg border-2 border-gray-300">
              <AvatarImage
                src={imageUrl}
                className="object-cover"
                alt={product.name || 'Product'}
              />
              <AvatarFallback className="rounded-lg bg-gray-200 text-gray-600 font-medium">
                {(product.name || 'P').charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h3 className="font-medium text-gray-900 mb-1">
                {product.name || 'Product'}
              </h3>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="font-normal bg-gray-200 text-gray-700"
                >
                  {t('confirmation.quantity_label', {
                    quantity: item.quantity,
                  })}
                </Badge>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {t('confirmation.sku', { sku: product.sku || '—' })}
                </span>
              </div>
            </div>

            <div className="text-right">
              <p className="font-semibold text-gray-900">
                {getCurrencySymbol(order.currency)}
                {(parseFloat(item.price) * item.quantity).toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">
                {getCurrencySymbol(order.currency)}
                {parseFloat(item.price).toFixed(2)} each
              </p>
            </div>
          </div>

          {index < order.OrderItems.length - 1 && (
            <Separator className="my-4 bg-gray-200" />
          )}
        </motion.div>
        );
      })}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        <div className="bg-gray-900 p-5 rounded-lg text-white">
          <div className="flex justify-between items-center">
            <h4 className="font-medium opacity-90">
              {t('confirmation.total_amount')}
            </h4>
            <motion.div whileHover={{ scale: 1.02 }} className="text-right">
              <p className="text-xl font-semibold">
                {getCurrencySymbol(order.currency)}
                {order.totalAmount}
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </CardContent>
  </Card>
);

const getCurrencySymbol = (currency) => {
  return currency === 'KHR' ? '៛' : '$';
};
