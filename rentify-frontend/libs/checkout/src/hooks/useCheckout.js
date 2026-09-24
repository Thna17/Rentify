// hooks/useCheckout.js
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@rentify/storefront';
import { useGetCustomerQuery } from '@rentify/storefront/api';
import { useCreateOrderMutation } from '../services/orderApi'
import { useStorefrontWebsite as useWebsiteData } from '@rentify/storefront/website';
import { useCart } from '@rentify/cart/hooks/useCart';
import { hostedCheckoutUrl, hostedRequest, isHostedStorefrontBuyer } from '@rentify/storefront/hostedBuyer';

export const useCheckout = () => {
  const { websiteId } = useWebsiteData();
  const hosted = isHostedStorefrontBuyer();
  const checkoutAttempt = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [currency, setCurrency] = useState('USD');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    province: 'Phnom Penh',
    district: '',
    commune: '',
    street: '',
    note: '',
    saveAddress: true,
  });
  
  const [fieldErrors, setFieldErrors] = useState({
    name: false,
    phone: false,
    district: false,
    street: false,
  });

  const { data: user } = useGetCustomerQuery(undefined, {
    skip: hosted || !isAuthenticated || role !== 'customer',
  });
  
  const {
    items: cartItems,
    summary,
    isLoading: cartLoading,
    isError: cartError,
    hostedQuote,
  } = useCart(websiteId);

  useEffect(() => {
  if (!cartLoading && (!cartItems || cartItems.length === 0)) {
    navigate('/cart'); // or '/products' if you prefer
  }
}, [cartLoading, cartItems, navigate]);


  // Derived state
  const totalQuantity = useMemo(
    () => cartItems.reduce((total, item) => total + item.quantity, 0),
    [cartItems]
  );
  
  const cart = useMemo(() => ({ CartItems: cartItems }), [cartItems]);
  const isFinalStep = activeStep === 2;

  // Effects
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const step = queryParams.get('step') || 'delivery';
    const stepIndex = { delivery: 0, payment: 1, review: 2 }[step] || 0;
    setActiveStep(stepIndex);
  }, [location.search]);

  useEffect(() => {
    if (user?.shippingAddress) {
      setFormData(prev => ({
        ...prev,
        name: user.shippingAddress.name || '',
        phone: user.shippingAddress.phone || '',
        province: user.shippingAddress.province || 'Phnom Penh',
        district: user.shippingAddress.district || '',
        commune: user.shippingAddress.commune || '',
        street: user.shippingAddress.street || '',
        note: user.shippingAddress.note || '',
      }));
    }
  }, [user]);

  // Callbacks
  const updateStepParam = useCallback((stepIndex) => {
    const stepName = ['delivery', 'payment', 'review'][stepIndex];
    navigate(`/checkout?step=${stepName}`, { replace: true });
  }, [navigate]);

  const validateStep = useCallback(() => {
    const errors = {
      name: !formData.name.trim(),
      phone: !/^[0-9]{8,9}$/.test(formData.phone),
      district: !formData.district.trim(),
      street: !formData.street.trim(),
    };
    setFieldErrors(errors);
    return !Object.values(errors).some(Boolean);
  }, [formData]);

  const handleNext = useCallback(() => {
    if (activeStep === 0 && !validateStep()) return false;
    
    const nextStep = Math.min(activeStep + 1, 2);
    setActiveStep(nextStep);
    updateStepParam(nextStep);
    return true;
  }, [activeStep, validateStep, updateStepParam]);

  const handleBack = useCallback(() => {
    if (activeStep === 0) {
      // Navigate to cart when on first step
      navigate('/cart'); 
    } else {
      // Regular step navigation
      const prevStep = Math.max(activeStep - 1, 0);
      setActiveStep(prevStep);
      updateStepParam(prevStep);
    }
  }, [activeStep, updateStepParam, navigate]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const toggleSummary = useCallback(() => setSummaryOpen(prev => !prev), []);

  const [createOrder] = useCreateOrderMutation();
  const handleSubmit = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      let orderResponse;
      if (hosted) {
        if (!hostedQuote?.checkoutReady || !hostedQuote.totalAmount) {
          throw new Error(hostedQuote?.issues?.join('; ') || 'Cart is not ready for checkout');
        }
        const address = [formData.street, formData.commune, formData.district,
          formData.province].filter(Boolean).join(', ');
        const body = { expectedTotalAmount: hostedQuote.totalAmount,
          customerInfo: { name: formData.name, phone: formData.phone },
          shippingInfo: { address } };
        const signature = JSON.stringify(body);
        if (checkoutAttempt.current?.signature !== signature) {
          checkoutAttempt.current = { signature, key: crypto.randomUUID() };
        }
        orderResponse = await hostedRequest(hostedCheckoutUrl(websiteId, '/checkout'), {
          method: 'POST', headers: { 'Idempotency-Key': checkoutAttempt.current.key },
          body: JSON.stringify(body),
        });
      } else {
        orderResponse = await createOrder({
          websiteId, paymentMethod, shippingDetails: formData, currency,
        }).unwrap();
      }
      
      navigate(`/confirmation/${orderResponse.order.id}`);
    } catch (err) {
      setError(err.data?.error || err.message || 'Order submission failed');
      return err;
    } finally {
      setLoading(false);
    }
  }, [createOrder, websiteId, paymentMethod, formData, currency, navigate, hosted, hostedQuote]);

  return {
    // State
    loading,
    error,
    activeStep,
    paymentMethod,
    summaryOpen,
    currency,
    formData,
    fieldErrors,
    cartItems,
    summary,
    cartLoading,
    cartError,
    totalQuantity,
    cart,
    isFinalStep,
    
    // Functions
    setFormData,
    setPaymentMethod,
    setSummaryOpen,
    setCurrency,
    handleNext,
    handleBack,
    handleInputChange,
    toggleSummary,
    handleSubmit,
    updateStepParam,
    validateStep,
  };
};

export default useCheckout
