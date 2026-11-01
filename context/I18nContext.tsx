import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '../i18n/en';
import rw from '../i18n/rw';
import fr from '../i18n/fr';
import sw from '../i18n/sw';

const translations: Record<string, any> = {
  en,
  rw,
  fr,
  sw,
};

/** Languages offered in Account → Language (native names). */
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'rw', label: 'Kinyarwanda' },
  { code: 'sw', label: 'Kiswahili' },
  { code: 'fr', label: 'Français' },
] as const;

export type Language = 'en' | 'rw' | 'fr' | 'sw';

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
        if (stored && ['en', 'rw', 'fr', 'sw'].includes(stored)) {
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
    const lookup = (lang: string) => key.split('.').reduce<any>((node, k) => (node && typeof node === 'object' ? node[k] : undefined), translations[lang]);
    // Missing Kinyarwanda/French strings fall back to English, never to the raw key.
    const value = lookup(language) ?? lookup('en');
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
