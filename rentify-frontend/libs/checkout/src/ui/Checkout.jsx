// CheckoutPage.js
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@rentify/utils/contexts/TranslationContext';
import { formatPrice } from '@rentify/utils/currency';
import { ShippingForm } from './components/ShippingForm'
import { PaymentMethodForm } from './components/PaymentMethodForm'
import { ReviewOrder } from './components/ReviewOrder'
import { cambodiaProvinces, cambodiaDistricts } from '../data/locations';
import { MobileSummaryBottomBar } from '@rentify/shared/ui/components/MobileSummaryBottomBar'
import { MobileSummaryDrawer } from '@rentify/shared/ui/components/MobileSummaryDrawer'
import { SummarySection } from '@rentify/shared/ui/components/SummarySection'
import useCheckout from '../hooks/useCheckout';
import { ClipboardList, X, HandCoins, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { Alert, AlertDescription } from '@rentify/shared/ui/alert';
import { useMediaQuery } from '@rentify/utils/hooks/useMediaQuery'

export const Checkout = () => {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 900px)'); 
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState('');

  // Use custom hook
  const {
    loading,
    error,
    activeStep,
    paymentMethod,
    summaryOpen,
    currency,
    formData,
    fieldErrors,
    summary,
    cartLoading,
    cart,
    totalQuantity,
    isFinalStep,
    setFormData,

    setPaymentMethod,
    setSummaryOpen,
    setCurrency,
    handleNext,
    handleBack,
    handleInputChange,
    toggleSummary,
    handleSubmit,
  } = useCheckout();

  // Snackbar handlers
  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = () => setSnackbarOpen(false);

  // Action handling with validation
  const handleStepAction = async () => {
    if (isFinalStep) {
      const err = await handleSubmit();
      if (err) showSnackbar(t('checkout.order_failed'));
    } else if (!handleNext()) {
      showSnackbar(t('checkout.validation_error'));
    }
  };

  // Step content renderer
  const getStepContent = (step) => {
    const commonProps = {  t, isMobile };

    switch (step) {
      case 0:
        return (
          <ShippingForm
            formData={formData}
            handleInputChange={handleInputChange}
            fieldErrors={fieldErrors}
            setFormData={setFormData}
            provinces={cambodiaProvinces}
            districts={cambodiaDistricts}
            {...commonProps}
          />
        );
      case 1:
        return (
          <PaymentMethodForm
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            {...commonProps}
          />
        );
      case 2:
        return (
          <ReviewOrder
            formData={formData}
            paymentMethod={paymentMethod}
            cart={cart}
            formatPrice={formatPrice}
            currency={currency}
            {...commonProps}
          />
        );
      default:
        return null;
    }
  };

  // Action label based on step
  const getActionLabel = () => {
    if (activeStep === 0) return t('checkout.continue_to_payment');
    if (activeStep === 1) return t('checkout.review_order');
    return t('checkout.confirm_order');
  };

  return (
    <div className=" max-w-6xl mx-auto  relative md:pb-0">
      {snackbarOpen && (
        <Alert
          variant="destructive"
          className="fixed md:top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md top-20"
        >
          <AlertDescription className="flex justify-between items-center">
            {snackbarMessage}
            <button onClick={handleCloseSnackbar} className="ml-4">
              <X size={18} />
            </button>
          </AlertDescription>
        </Alert>
      )}

      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        {activeStep === 0 && (
          <>
            <ClipboardList size={20} className="text-primary" />
            {t('checkout.shipping_details')}
          </>
        )}
        {activeStep === 1 && (
          <>
            <HandCoins size={20} className="text-primary" />
            {t('checkout.payment_method')}
          </>
        )}
        {activeStep === 2 && (
          <>
            <CheckCircle size={20} className="text-primary" />
            {t('checkout.review_order')}
          </>
        )}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="p-0 md:p-4  w-full shadow-lg border-border/50">
            <CardContent className="p-2 md:p-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {getStepContent(activeStep)}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
        <div className="hidden md:block">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <SummarySection
              summary={summary}
              itemCount={cart?.CartItems?.length || 0}
              currency={currency}
              setCurrency={setCurrency}
              showCurrencySwitch={true}
              showActionButtons={true}
              actionLabel={getActionLabel()}
              onAction={handleStepAction}
              onBack={handleBack}
              isLoading={loading}
              error={error}
              isFinalStep={isFinalStep}
              showSecurityFooter={true}
              conversionRate={4000}
              activeStep={activeStep}
            />
          </motion.div>
        </div>
      </div>

      {isMobile && (
        <>
          <MobileSummaryBottomBar
            totalQuantity={totalQuantity}
            totalPrice={formatPrice(summary?.total || 0, currency)}
            onToggleSummary={toggleSummary}
            onAction={handleStepAction}
            actionLabel={getActionLabel()}
            isFinalStep={isFinalStep}
            isLoading={loading}
          />
          <MobileSummaryDrawer
            open={summaryOpen}
            onClose={toggleSummary}
            totalQuantity={totalQuantity}
            summary={summary}
            onAction={handleStepAction}
            actionLabel={getActionLabel()}
            isFinalStep={isFinalStep}
            isLoading={loading}
            currency={currency}
            setCurrency={setCurrency}
            isCheckout={true}
          />
        </>
      )}
    </div>
  );
};

export default Checkout;
