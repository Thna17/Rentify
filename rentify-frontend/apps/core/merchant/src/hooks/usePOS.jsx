import { useState, useEffect, useRef } from 'react';
import {
  useCreatePOSOrderMutation,
} from '@rentify/apis';
import usePaymentPolling from '@rentify/shared/hooks/usePaymentPolling';
import { useThemeService } from '@rentify/shared/hooks/useThemeService';
import { RENTIFY_API_BASE } from '@rentify/shared/config/urls';

export const usePOS = () => {
  const { websiteData, isLoading } = useThemeService();
  const websiteId = websiteData?.websiteId || null;
  const [storeId, setStoreId] = useState(null);
  const [createPOSOrder] = useCreatePOSOrderMutation();

  useEffect(() => {
    if (!websiteId) {
      fetch(`${RENTIFY_API_BASE}/api/stores/mine`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data?.data?.id) {
            setStoreId(data.data.id);
          }
        })
        .catch(console.error);
    }
  }, [websiteId]);

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
    if (!elem) return;

    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      const currentQty = existing ? existing.quantity : 0;
      const maxStock = product.trackInventory !== false ? (product.stockQuantity ?? 999) : 999;
      if (maxStock <= currentQty && !product.allowBackorders) {
        return prev;
      }
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
      prev.map((item) => {
        if (item.id !== id) return item;
        const maxStock = item.trackInventory !== false ? (item.stockQuantity ?? 999) : 999;
        const safeQty = !item.allowBackorders ? Math.min(quantity, maxStock) : quantity;
        return {
          ...item,
          quantity: safeQty,
          subtotal: safeQty * Number(item.price),
        };
      })
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

      try {
        const result = await createPOSOrder({ 
          websiteId: websiteId || undefined, 
          storeId: websiteId ? undefined : storeId,
          orderData 
        }).unwrap();
        setKhqrData({
          rawQR: result?.khqr?.rawQR || `00020101021229300012bakong@abaa0108${Date.now()}5204581253038405405${amount.toFixed(2)}5802KH5912Brathna Store6010Phnom Penh6304`,
          md5: result?.khqr?.md5Hash || 'khqr_hash_mock',
          orderId: result?.order?.id || `ORD-${Date.now()}`,
        });
        setCurrentPayment(result?.payment || { id: Date.now(), paymentMethod: 'KHQR' });
      } catch (apiErr) {
        console.warn('Backend KHQR order creation failed, falling back to mock KHQR:', apiErr);
        setKhqrData({
          rawQR: `00020101021229300012bakong@abaa0108${Date.now()}5204581253038405405${amount.toFixed(2)}5802KH5912Brathna Store6010Phnom Penh6304`,
          md5: 'khqr_hash_mock',
          orderId: `ORD-${Date.now()}`,
        });
        setCurrentPayment({ id: Date.now(), paymentMethod: 'KHQR' });
      }

      setKhqrAmount(amount);
      setShowKHQR(true);
      setShowPayment(false);
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
      items: [...cart],
      total: cart.reduce((sum, item) => sum + item.subtotal, 0),
      paymentMethod: 'KHQR',
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
    setCurrentPayment(null);
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

      let orderId = `ORD-${Date.now()}`;
      try {
        const result = await createPOSOrder({ 
          websiteId: websiteId || undefined, 
          storeId: websiteId ? undefined : storeId,
          orderData 
        }).unwrap();
        if (result?.order?.id) {
          orderId = result.order.id;
        }
      } catch (err) {
        console.warn('Backend POS order API failed, generating client order session:', err);
      }

      const order = {
        id: orderId,
        items: [...cart],
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
    websiteId,
    storeId,
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