import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import enTranslations from '../locales/en.json';
import khTranslations from '../locales/kh.json';
import {
  applyDocumentLanguage,
  formatDate,
  formatNumber,
  interpolate,
  readLanguagePreference,
  resolveMessage,
  subscribeLanguagePreference,
  writeLanguagePreference,
} from '@rentify/utils/i18n/languagePreference';

// The marketing locale files contain both legacy flat keys and nested keys;
// resolveMessage reads both.
const catalogs = {
  en: enTranslations,
  km: khTranslations,
};

// Marketing components compare against 'EN' | 'KH'; the shared preference
// stores 'en' | 'km'.
const toLegacy = (lang) => (lang === 'km' ? 'KH' : 'EN');

const LanguageContext = createContext(undefined);

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(readLanguagePreference);

  useEffect(() => {
    applyDocumentLanguage(lang);
  }, [lang]);

  useEffect(() => subscribeLanguagePreference(setLang), []);

  const setLanguage = useCallback((value) => {
    setLang(writeLanguagePreference(value));
  }, []);

  const toggleLanguage = useCallback(() => {
    setLang((current) => writeLanguagePreference(current === 'km' ? 'en' : 'km'));
  }, []);

  const t = useCallback(
    (key, params) => {
      const message = resolveMessage(catalogs, lang, key, params);
      return message === undefined ? key : interpolate(message, params);
    },
    [lang],
  );

  const value = useMemo(
    () => ({
      lang,
      language: toLegacy(lang),
      isKhmer: lang === 'km',
      setLanguage,
      toggleLanguage,
      t,
      formatNumber: (number, options) => formatNumber(lang, number, options),
      formatDate: (date, options) => formatDate(lang, date, options),
    }),
    [lang, setLanguage, toggleLanguage, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
