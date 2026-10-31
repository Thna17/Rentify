// src/contexts/TranslationContext.js
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// Import translation dictionaries
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
} from '../i18n/languagePreference';

const TranslationContext = createContext();

const catalogs = {
  en: enTranslations,
  km: khTranslations,
};

// `language` keeps the catalog codes this app has always used ('en' | 'kh');
// `lang` is the shared BCP 47 code ('en' | 'km').
const toLegacy = (lang) => (lang === 'km' ? 'kh' : 'en');

export function TranslationProvider({ children }) {
  const [lang, setLang] = useState(readLanguagePreference);

  useEffect(() => {
    applyDocumentLanguage(lang);
  }, [lang]);

  useEffect(() => subscribeLanguagePreference(setLang), []);

  const setLanguage = useCallback((value) => {
    setLang(writeLanguagePreference(value));
  }, []);

  const t = useCallback(
    (key, params = {}) => {
      // Falls back to English, then to the key so a missing entry is visible.
      const message = resolveMessage(catalogs, lang, key, params);
      return message === undefined ? key : interpolate(message, params);
    },
    [lang],
  );

  const value = useMemo(
    () => ({
      t,
      lang,
      language: toLegacy(lang),
      isKhmer: lang === 'km',
      setLanguage,
      formatNumber: (number, options) => formatNumber(lang, number, options),
      formatDate: (date, options) => formatDate(lang, date, options),
    }),
    [t, lang, setLanguage],
  );

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

export const useTranslation = () => useContext(TranslationContext);
