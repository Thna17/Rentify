import { Card } from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from '@rentify/utils/contexts/TranslationContext';
import { useGetOrderByIdQuery } from '@rentify/storefront/api';
import { useStorefrontWebsite as useWebsiteData } from '@rentify/storefront/website';
import { staticOrder } from '../data/staticOrder';
import usePaymentPolling from '@rentify/shared/hooks/usePaymentPolling';
import { OrderStatusHeader } from './components/OrderStatusHeader';
import { OrderSummary } from './components/OrderSummary';
import { DeliveryProgress } from './components/DeliveryProgress';
import { PaymentMethodSection } from './components/PaymentMethodSection';
import { DeliveryAddress } from './components/DeliveryAddress';
import { ActionButtons } from './components/ActionButtons';
import { PaymentDetails } from './components/PaymentDetails';

export const OrderConfirmation = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { orderId } = useParams();
  const { preview, getFilteredContent } = useWebsiteData();
  const { data: apiOrder, isLoading, isError } = useGetOrderByIdQuery(orderId);
  const order = preview ? staticOrder : apiOrder;
  const isDemoOrder = preview;
  
  // Use custom hook for payment polling
  const paymentStatus = usePaymentPolling({
    paymentMethod: order?.payment?.paymentMethod,
    paymentId: apiOrder?.payment?.id,
    isPreview: preview,
  });

  const globalSettingContent = getFilteredContent('global setting');
  const websiteName =
    globalSettingContent.find((item) => item.label === 'Website Name')?.value ||
    t('confirmation.default_website_name');
  const phoneNumber =
    globalSettingContent.find((item) => item.label === 'Phone Number')?.value ||
    t('confirmation.default_phone_number');
  const socialMediaLinks =
    globalSettingContent.find((item) => item.label === 'Social Media')?.value ||
    {};

  const mapOrderToInvoiceData = (order, websiteName, phoneNumber) => {
    return {
      invoiceNumber: order.orderNumber,
      customerName: order.shippingDetail.name,
      customerPhone: order.shippingDetail.phone,
      address: `${order.shippingDetail.street}, ${order.shippingDetail.district}, ${order.shippingDetail.province}`,
      createdAt: order.createdAt,
      dueDate:
        order.dueDate ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      items:
        order.OrderItems?.map((item) => ({
          name: item.Product?.name || '',
          quantity: item.quantity,
          price: parseFloat(item.price),
          total: parseFloat(item.quantity) * parseFloat(item.price),
        })) || [],
      subtotal: `$${order.totalAmount}`,
      discountAmount: '$0.00',
      taxAmount: '$0.00',
      total: `$${order.totalAmount}`,
      paymentMethod: order.Payment?.paymentMethod || '',
      currency: order.currency || 'USD',
      referenceId: order.orderNumber,
      notes: order.notes || '',
      paymentData: order.Payment,
    };
  };

  const companyInfo = {
    name: websiteName,
    address: '',
    phone: phoneNumber,
    email: '',
    website: '',
    watermark: websiteName,
    logo: '',
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container max-w-6xl py-8 mx-auto px-4">
          <div className="flex flex-col gap-6">
            <Skeleton className="w-full h-32 rounded-xl" />
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1 space-y-6">
                <Skeleton className="w-full h-64 rounded-xl" />
                <Skeleton className="w-full h-48 rounded-xl" />
              </div>
              <div className="lg:w-96 space-y-6">
                <Skeleton className="w-full h-48 rounded-xl" />
                <Skeleton className="w-full h-64 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if ((!preview && isError) || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="p-8 text-center rounded-2xl shadow-sm border border-gray-200">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              {t('confirmation.error_title')}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('confirmation.error_description')}
            </p>
            <Button 
              className="w-full bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              onClick={() => navigate('/')}
            >
              {t('confirmation.return_to_home')}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen bg-gray-50  rounded-xl overflow-hidden shadow-sm">
      <div className="container max-w-6xl py-8 mx-auto px-4">
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
              <OrderStatusHeader
                order={order}
                isDemoOrder={isDemoOrder}
                t={t}
              />

              <div className="flex flex-col lg:flex-row">
                {/* Main Content */}
                <div className="flex-1">
                  <OrderSummary order={order} t={t} />
                  
                  {/* Mobile Payment Section */}
                  <div className="lg:hidden">
                    <PaymentMethodSection
                      order={order}
                      paymentStatus={paymentStatus}
                      t={t}
                    />
                  </div>
                  
                  <DeliveryProgress order={order} t={t} />
                  {/* <AddressAndPaymentDetails order={order} t={t} /> */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <DeliveryAddress order={order} t={t} />
                          <PaymentDetails order={order} t={t} />
                    </div>
                </div>

                {/* Sidebar */}
                <div className="lg:w-96 bg-gray-50 lg:pl-8">
                  <div className="space-y-6 lg:sticky lg:top-8">
                    {/* Desktop Payment Section */}
                    <div className="hidden lg:block">
                      <PaymentMethodSection
                        order={order}
                        paymentStatus={paymentStatus}
                        t={t}
                      />
                    </div>

                    <ActionButtons
                      order={order}
                      navigate={navigate}
                      t={t}
                      websiteName={websiteName}
                      phoneNumber={phoneNumber}
                      socialMediaLinks={socialMediaLinks}
                      invoiceData={mapOrderToInvoiceData(
                        order,
                        websiteName,
                        phoneNumber
                      )}
                      companyInfo={companyInfo}
                    />
                  </div>
                </div>
              </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OrderConfirmation;
