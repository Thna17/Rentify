import { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@rentify/utils/hooks/useMediaQuery';
import { useStorefrontAuth } from './hooks/useStorefrontAuth';
import { useStorefrontWebsite } from './website';

const Context = createContext(null);

export const HeaderProvider = ({ children }) => {
  const navigate = useNavigate();
  const auth = useStorefrontAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [bottomNavValue, setBottomNavValue] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 900px)');
  const { getFilteredContent } = useStorefrontWebsite();
  const globalSettings = getFilteredContent('global setting');
  const websiteName =
    globalSettings.find((item) => item.label === 'Website Name')?.value ||
    'My Store';

  const handleSearch = (event) => {
    event.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <Context.Provider
      value={{
        isMobile,
        visible: true,
        websiteName,
        searchQuery,
        setSearchQuery,
        bottomNavValue,
        setBottomNavValue,
        mobileMenuOpen,
        setMobileMenuOpen,
        handleSearch,
        isAuthenticated: auth.isAuthenticated,
        isCustomerAuthenticated: auth.isCustomer,
        isOwner: auth.isOwner,
        isMerchant: auth.isMerchant,
        isStaff: auth.isStaff,
        role: auth.role,
        userData: auth.profile,
        profile: auth.profile,
        handleLogout: auth.logout,
      }}
    >
      {children}
    </Context.Provider>
  );
};

export const useHeader = () => {
  const context = useContext(Context);
  if (!context) {
    throw new Error('useHeader must be used within a HeaderProvider');
  }
  return context;
};
