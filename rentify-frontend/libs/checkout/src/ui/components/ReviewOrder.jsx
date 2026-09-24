import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  Truck, 
  Lock, 
  DollarSign, 
  FileText 
} from 'lucide-react';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { Separator } from '@rentify/shared/ui/separator';
import { Badge } from '@rentify/shared/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@rentify/shared/ui/avatar';

const staggerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1 },
  }),
};

export const ReviewOrder = ({ 
  formData, 
  cart, 
  t, 
  formatPrice,
  currency
}) => {
  // Conversion rate (1 USD = 4000 KHR)
  const conversionRate = 4000;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6 space-y-6">
          {/* Contact Information */}
          <div className="flex items-start">
            <div className="bg-green-100 p-2 rounded-full mr-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {t('checkout.contact')}
              </p>
              <p className="font-semibold">
                {formData.name} • {formData.phone}
              </p>
            </div>
          </div>

          <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Shipping Address */}
          <div className="flex items-start">
            <div className="bg-blue-100 p-2 rounded-full mr-4">
              <Truck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {t('checkout.shipping')}
              </p>
              <p className="font-semibold">
                {formData.street}, {formData.district}, {formData.province}
              </p>
            </div>
          </div>

          {/* Delivery Note (if exists) */}
          {formData.note && (
            <>
              <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />
              <div className="flex items-start">
                <div className="bg-amber-100 p-2 rounded-full mr-4">
                  <FileText className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {t('checkout.delivery_note')}
                  </p>
                  <p className="font-medium italic">
                    {formData.note}
                  </p>
                </div>
              </div>
            </>
          )}

          <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

          {/* Payment Method */}
          <div className="flex items-start">
            <div className="bg-purple-100 p-2 rounded-full mr-4">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                {t('checkout.payment')}
              </p>
              <p className="font-semibold">
                {t('checkout.cash_on_delivery')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold mb-4">
            {t('checkout.order_items')}
          </h3>
          
          <div className="space-y-6">
            {cart?.CartItems?.map((item, index) => (
              <motion.div
                key={item.id}
                custom={index}
                variants={staggerVariants}
                initial="hidden"
                animate="visible"
                whileHover={{ y: -2 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="group"
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Product Image */}
                  <div className="col-span-3 sm:col-span-2 relative overflow-hidden rounded-lg bg-muted">
                    <div className="aspect-square relative overflow-hidden rounded-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-md">
                      <Avatar className="h-full w-full rounded-lg">
                        <AvatarImage 
                          src={item.Product.images[0]?.url} 
                          alt={item.Product.name}
                          className="object-cover"
                        />
                        <AvatarFallback className="rounded-lg">
                          {item.Product.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="col-span-6 sm:col-span-7">
                    <h4 className="font-semibold text-base mb-1 line-clamp-1">
                      {item.Product.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="font-medium">
                        {t('checkout.quantity_label', {
                          quantity: item.quantity,
                        })}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {t('checkout.sku', { sku: item.Product.sku })}
                      </span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="col-span-3 sm:col-span-3 text-right">
                    <p className="font-bold text-primary text-lg">
                      {formatPrice(item.Product.price * item.quantity, currency, conversionRate)}
                    </p>
                  </div>
                </div>

                {/* Divider between items */}
                {index < cart.CartItems.length - 1 && (
                  <Separator className="my-4 bg-gradient-to-r from-transparent via-border to-transparent" />
                )}
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security Note */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Lock className="h-4 w-4 text-green-500" />
        <span>{t('checkout.secure_transaction_short')}</span>
      </div>

      {/* Decorative Checkmark */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2 }}
        className="flex justify-center"
      >
        <CheckCircle className="h-16 w-16 text-green-500/20" />
      </motion.div>
    </motion.div>
  );
};
