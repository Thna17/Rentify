// hooks/useNavigation.js
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const useNavigation = () => {
  const location = useLocation();
  const [activeNav, setActiveNav] = useState('home');
  const [bottomNavValue, setBottomNavValue] = useState(null);

  useEffect(() => {
    const path = location.pathname;
    if (path === '/') setActiveNav('home');
    else if (path === '/cart') setActiveNav('cart');
    else if (path === '/dashboard') setActiveNav('dashboard');
    else if (path === '/orders') setActiveNav('orders');
    else setActiveNav(null);
  }, [location]);

  return {
    activeNav,
    setActiveNav,
    bottomNavValue,
    setBottomNavValue,
  };
};