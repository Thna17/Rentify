import React, { useState } from 'react';
import { Card, CardContent, CardFooter } from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';
import { Separator } from '@rentify/shared/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@rentify/shared/ui/dialog';
import { motion } from 'framer-motion';
import { useCancelOrderByCustomerMutation } from '@rentify/storefront/api';
import { 
  X, 
  ShoppingCart, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin,
  MessageCircle
} from 'lucide-react';
import { DownloadInvoiceButton } from './DownloadInvoice';

const socialIcons = {
  facebook: Facebook,
  twitter: Twitter,
  instagram: Instagram,
  linkedin: Linkedin,
};

export const ActionButtons = ({
  order,
  navigate,
  t,
  websiteName,
  phoneNumber,
  socialMediaLinks,
  invoiceData,
  companyInfo,
}) => {
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [cancelOrderByCustomer] = useCancelOrderByCustomerMutation();

  const handleCancelOrder = async () => {
    setIsCanceling(true);
    try {
      await cancelOrderByCustomer(order.id).unwrap();
      setIsCanceling(false);
      setOpenCancelDialog(false);
      // Optionally, reload or update the page
      window.location.reload();
    } catch (error) {
      console.error('Cancel order failed:', error);
      setIsCanceling(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="border border-gray-300  shadow-sm">
        <CardContent className="p-5 space-y-4">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <DownloadInvoiceButton
              invoiceData={invoiceData}
              companyInfo={companyInfo}
              websiteName={websiteName}
            />
          </motion.div>

          {order.status !== 'cancelled' && order.status !== 'completed' && (
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                size="lg"
                className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                disabled={isCanceling}
                onClick={() => setOpenCancelDialog(true)}
              >
                {isCanceling ? (
                  <>
                    <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin mr-2" />
                    {t('confirmation.canceling')}
                  </>
                ) : (
                  <>
                    <X className="w-5 h-5 mr-2" />
                    {t('confirmation.cancel_order')}
                  </>
                )}
              </Button>
            </motion.div>
          )}

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              className="w-full bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              size="lg"
              onClick={() => navigate('/')}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              {t('confirmation.continue_shopping')}
            </Button>
          </motion.div>
        </CardContent>

        <Separator className="bg-gray-300" />

        <CardFooter className="p-5 flex flex-col items-center space-y-4">
          <div className="flex  items-center gap-2 text-center">
            <MessageCircle className="w-4 h-4 text-gray-500" />
            <p className="text-sm text-gray-600">
              {t('confirmation.contact_us')}
              <strong>{phoneNumber}</strong>
            </p>
          </div>
          
          <div className="flex justify-center gap-2">
            {Object.entries(socialMediaLinks || {}).map(([platform, url]) => {
              const IconComponent = socialIcons[platform];
              const urlString = typeof url === 'string' ? url : '';
              return (
                urlString?.trim() && IconComponent && (
                  <motion.div
                    key={platform}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="text-gray-500 hover:text-gray-900 transition-colors hover:bg-gray-100"
                    >
                      <a href={urlString} target="_blank" rel="noopener noreferrer">
                        <IconComponent className="w-5 h-5" />
                      </a>
                    </Button>
                  </motion.div>
                )
              );
            })}
          </div>
        </CardFooter>
      </Card>

      {/* Cancel Order Dialog */}
      <Dialog open={openCancelDialog} onOpenChange={setOpenCancelDialog}>
        <DialogContent className="sm:max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <X className="w-5 h-5 text-red-500" />
              {t('confirmation.cancel_dialog_title')}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {t('confirmation.cancel_dialog_message', { id: order.orderNumber })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setOpenCancelDialog(false)}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              {t('confirmation.close_dialog')}
            </Button>
            <Button 
              className="flex-1 bg-red-600 text-white hover:bg-red-700 transition-colors"
              onClick={handleCancelOrder}
              disabled={isCanceling}
            >
              {isCanceling ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {t('confirmation.canceling')}
                </>
              ) : (
                t('confirmation.confirm_cancel')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ActionButtons;
