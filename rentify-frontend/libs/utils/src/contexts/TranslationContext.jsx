// src/contexts/TranslationContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

// Import translation dictionaries
import enTranslations from '../locales/en.json';
import khTranslations from '../locales/kh.json';

const TranslationContext = createContext();

export function TranslationProvider({ children }) {
  const [language, setLanguage] = useState(
    localStorage.getItem('appLanguage') || 'en'
  );

  const translations = {
    en: enTranslations,
    kh: khTranslations,
  };

  const t = (key, params = {}) => {
    // Handle nested keys (e.g., 'header.location')
    const keys = key.split('.');
    let translation =
      keys.reduce((acc, currentKey) => {
        return acc && acc[currentKey] ? acc[currentKey] : null;
      }, translations[language]) || key; // Fallback to key if not found

    // Replace dynamic parameters
    if (typeof translation === 'string') {
      Object.keys(params).forEach((param) => {
        translation = translation.replace(`{{${param}}}`, params[param]);
      });
    }

    return translation;
  };

  useEffect(() => {
    localStorage.setItem('appLanguage', language);
  }, [language]);

  return (
    <TranslationContext.Provider value={{ t, language, setLanguage }}>
      {children}
    </TranslationContext.Provider>
  );
}

export const useTranslation = () => useContext(TranslationContext);
