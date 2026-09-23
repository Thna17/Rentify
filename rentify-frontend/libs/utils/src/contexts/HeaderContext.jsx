// contexts/HeaderContext.js
import React, { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useAuth } from '../hooks/useAuth';
import { useNavigation } from '../hooks/useNavigation';
import { useScrollBehavior } from '../hooks/useScrollBehavior';
import { useWebsiteData } from '@rentify/shared/context/WebsiteContext'

const HeaderContext = createContext();

export const HeaderProvider = ({ children }) => {
  const isMobile = useMediaQuery('(max-width: 900px)');
  const navigate = useNavigate();

  const { profile, isAuthenticated, role, isLoading, handleLogout, refreshProfile } = useAuth();
  const { activeNav, setActiveNav, bottomNavValue, setBottomNavValue } =
    useNavigation();
  const { visible } = useScrollBehavior();

  const { getFilteredContent } = useWebsiteData();


  // Local UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const globalSettingContent = getFilteredContent('global setting');
  const logoImage =
    globalSettingContent.find((item) => item.label === 'Logo')?.value ||
    'default-logo.png';
  const websiteName =
    globalSettingContent.find((item) => item.label === 'Website Name')?.value ||
    'My Store';

  const handleLanguageChange = (lang) => setCurrentLanguage(lang);

  // Update handleSearch function
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const params = new URLSearchParams(location.search);
      params.set('search', searchQuery.trim());
      params.delete('page'); // Reset to first page
      navigate(`/products?${params.toString()}`);
    }
  };

  return (
    <HeaderContext.Provider
      value={{
        isMobile,
        handleLogout,
        activeNav,
        setActiveNav,
        bottomNavValue,
        setBottomNavValue,
        visible,
        searchQuery,
        setSearchQuery,
        isAuthenticated,
        currentLanguage,
        handleLanguageChange,
        mobileMenuOpen,
        setMobileMenuOpen,
        handleSearch,
        logoImage,
        websiteName,
        profile,
        role,
        isLoading,
        refreshProfile
      }}
    >
      {children}
    </HeaderContext.Provider>
  );
};

export const useHeader = () => {
  const context = useContext(HeaderContext);
  if (!context)
    throw new Error('useHeader must be used within a HeaderProvider');
  return context;
};
