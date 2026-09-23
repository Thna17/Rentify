import React, { createContext, useContext, useState } from 'react';
import enTranslations from '../locales/en.json';
import khTranslations from '../locales/kh.json';

const translations = {
  EN: enTranslations,
  KH: khTranslations,
};

const LanguageContext = createContext(undefined);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('EN');

  const toggleLanguage = () => {
    setLanguage(language === 'EN' ? 'KH' : 'EN');
  };

  const t = (key) => {
    const dictionary = translations[language];
    const directTranslation = dictionary[key];
    if (directTranslation) return directTranslation;

    // The marketing locale files contain both legacy flat keys and nested
    // keys. Supporting both keeps every navigation and onboarding label
    // readable while the catalogue is consolidated.
    return (
      key.split('.').reduce((value, part) => value?.[part], dictionary) || key
    );
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, toggleLanguage, t }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
