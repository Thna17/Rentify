// hooks/useCheckout.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@rentify/utils';
import { useGetCustomerQuery } from '@rentify/apis';
import { useCreateOrderMutation } from '@rentify/order/services/orderApi'
import { useWebsiteData } from '@rentify/shared/context/WebsiteContext';
import { useCart } from '@rentify/cart/hooks/useCart';

export const useCheckout = () => {
  const { websiteId } = useWebsiteData();
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

  const { data: user } = useGetCustomerQuery({
    skip: !isAuthenticated && role !== 'customer',
  });
  
  const {
    items: cartItems,
    summary,
    isLoading: cartLoading,
    isError: cartError,
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
      
      const orderResponse = await createOrder({
        websiteId,
        paymentMethod,
        shippingDetails: formData,
        currency,
      }).unwrap();

      console.log(orderResponse);
      
      navigate(`/confirmation/${orderResponse.order.id}`);
    } catch (err) {
      setError(err.data?.error || 'Order submission failed');
      return err;
    } finally {
      setLoading(false);
    }
  }, [createOrder, websiteId, paymentMethod, formData, currency, navigate]);

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