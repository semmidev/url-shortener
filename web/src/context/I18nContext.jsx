import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { en } from '../locales/en';
import { id } from '../locales/id';

const dictionaries = { en, id };

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem('app-language');
    if (saved && (saved === 'en' || saved === 'id')) {
      return saved;
    }
    // Auto-detect Indonesian browser preference
    const browserLang = navigator.language || navigator.userLanguage || '';
    return browserLang.toLowerCase().startsWith('id') ? 'id' : 'en';
  });

  useEffect(() => {
    localStorage.setItem('app-language', language);
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  const setLanguage = useCallback((lang) => {
    if (lang === 'en' || lang === 'id') {
      setLanguageState(lang);
    }
  }, []);

  const t = useCallback(
    (keyPath, params = {}) => {
      const keys = keyPath.split('.');
      let result = dictionaries[language];

      for (const k of keys) {
        if (result && typeof result === 'object' && k in result) {
          result = result[k];
        } else {
          result = null;
          break;
        }
      }

      // Fallback to English dictionary if key not found in selected language
      if (result === null && language !== 'en') {
        let fallbackResult = dictionaries.en;
        for (const k of keys) {
          if (fallbackResult && typeof fallbackResult === 'object' && k in fallbackResult) {
            fallbackResult = fallbackResult[k];
          } else {
            fallbackResult = null;
            break;
          }
        }
        result = fallbackResult;
      }

      if (typeof result !== 'string') {
        return keyPath;
      }

      // Parameter interpolation (e.g. "Hello {name}")
      return result.replace(/\{(\w+)\}/g, (_, p1) => (p1 in params ? params[p1] : `{${p1}}`));
    },
    [language]
  );

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
