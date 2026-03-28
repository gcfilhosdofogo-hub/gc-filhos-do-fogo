import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Language, TranslationKey, getTranslation } from './translations';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey, params?: Record<string, any>) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'pt',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key) => key,
});

const STORAGE_KEY = 'ffogo_lang';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored === 'es' || stored === 'pt') ? stored : 'pt';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'pt' ? 'es' : 'pt');
  }, [language, setLanguage]);

  const t = useCallback((key: TranslationKey, params?: Record<string, any>) => {
    return getTranslation(language, key, params);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
