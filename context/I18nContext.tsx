import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '../i18n/en';
import rw from '../i18n/rw';
import fr from '../i18n/fr';

const translations: Record<string, any> = {
  en,
  rw,
  fr,
};

type Language = 'en' | 'rw' | 'fr';

type I18nContextType = {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, params?: Record<string, string>) => string;
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadLang() {
      try {
        const stored = await AsyncStorage.getItem('app_language');
        if (stored && ['en', 'rw', 'fr'].includes(stored)) {
          setLanguageState(stored as Language);
        }
      } catch (e) {
        // ignore
      } finally {
        setIsLoaded(true);
      }
    }
    loadLang();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem('app_language', lang);
  };

  const t = (key: string, params?: Record<string, string>) => {
    const keys = key.split('.');
    let value = translations[language];
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        value = undefined;
        break;
      }
    }
    
    let result = (value as string) || key;
    if (params && typeof result === 'string') {
      Object.keys(params).forEach(p => {
        result = result.replace(`{{${p}}}`, params[p]);
      });
    }
    return result;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useT must be used within I18nProvider');
  }
  return context.t;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
