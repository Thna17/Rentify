import { useState, useEffect, useRef } from 'react';
import {
  useCreatePOSOrderMutation,
} from '@rentify/apis';
import { useWebsiteData } from '@rentify/shared/context/WebsiteContext';
import usePaymentPolling from '@rentify/shared/hooks//usePaymentPolling';

export const usePOS = () => {
  const { websiteId, preview } = useWebsiteData();
  const [createPOSOrder] = useCreatePOSOrderMutation();
  const [activeTab, setActiveTab] = useState('pos');
  const [cart, setCart] = useState([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isDualScreen, setIsDualScreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showKHQR, setShowKHQR] = useState(false);
  const [khqrAmount, setKhqrAmount] = useState(0);
  const [khqrData, setKhqrData] = useState(null);
  const posRef = useRef();

  const [currentPayment, setCurrentPayment] = useState(null);
  const paymentStatus = usePaymentPolling({
    paymentMethod: currentPayment?.paymentMethod,
    paymentId: currentPayment?.id,
    isPreview: preview,
  });
  useEffect(() => {
    if (paymentStatus === 'completed' && currentPayment && khqrData) {
      handleKHQRComplete();
    }
  }, [paymentStatus, currentPayment, khqrData]);
  // Fullscreen handling
  useEffect(() => {
    const onFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = () => {
    const elem = posRef.current;
    if (!isFullscreen) {
      if (elem.requestFullscreen) elem.requestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * Number(item.price),
              }
            : item
        );
      }
      return [
        ...prev,
        { ...product, quantity: 1, subtotal: Number(product.price) },
      ];
    });
  };

  const updateCartItem = (id, quantity) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantity, subtotal: quantity * item.price }
          : item
      )
    );
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  const handleKHQRPayment = async (amount) => {
    try {
      const orderData = {
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
        })),
        paymentMethod: 'KHQR',
        cashierId: 1,
        customerInfo: { name: 'Walk-in Customer' },
      };
      const result = await createPOSOrder({ websiteId, orderData }).unwrap();
      setKhqrData({
        rawQR: result.khqr.rawQR,
        md5: result.khqr.md5Hash,
        orderId: result.order.id,
      });

      setCurrentPayment(result.payment);
      setKhqrAmount(amount);
      setShowKHQR(true);
      setShowPayment(false);
      setPollingCount(0);
      if (isDualScreen) {
        setActiveTab('customer-display');
      }
    } catch (error) {
      console.error('KHQR Order creation failed:', error);
    }
  };

  const handleKHQRComplete = () => {
    const order = {
      id: khqrData?.orderId || `ORD-${Date.now()}`,
      items: cart,
      total: cart.reduce((sum, item) => sum + item.subtotal, 0),
      paymentMethod: 'khqr',
      timestamp: new Date(),
      status: 'completed',
    };
    setCurrentOrder(order);
    setOrders((prev) => [order, ...prev]);
    setShowKHQR(false);
    setShowReceipt(true);
    clearCart();
    setKhqrData(null);
        setCurrentPayment(null);
  };

  const handleKHQRCancel = () => {
    setShowKHQR(false);
    setShowPayment(true);
    setKhqrData(null);
  };

  const handlePaymentComplete = async (paymentMethod) => {
    try {
      const orderData = {
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
        })),
        paymentMethod,
        cashierId: 1,
        customerInfo: { name: 'Walk-in Customer' },
      };
      const result = await createPOSOrder({ websiteId, orderData }).unwrap();
      const order = {
        id: result.order.id,
        items: cart,
        total: cart.reduce((sum, item) => sum + item.subtotal, 0),
        paymentMethod,
        timestamp: new Date(),
        status: 'completed',
      };
      setCurrentOrder(order);
      setOrders((prev) => [order, ...prev]);
      setShowPayment(false);
      setShowReceipt(true);
      clearCart();
    } catch (error) {
      console.error('Order creation failed:', error);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0);

  return {
    activeTab,
    paymentStatus,
    setActiveTab,
    cart,
    cartTotal,
    showPayment,
    setShowPayment,
    showReceipt,
    setShowReceipt,
    currentOrder,
    orders,
    isDualScreen,
    setIsDualScreen,
    isFullscreen,
    showKHQR,
    khqrAmount,
    khqrData,
    posRef,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    handleKHQRPayment,
    handleKHQRComplete,
    handleKHQRCancel,
    handlePaymentComplete,
    handleToggleFullscreen,
  };
};

export default usePOS;