import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'dark' | 'light';

export type ThemeColors = {
  background: string;
  backgroundCard: string;
  backgroundElevated: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  primary: string;
  success: string;
  error: string;
  tabBarBg: string;
  tabBarBorder: string;
  inputBg: string;
  inputBorder: string;
  sectionBg: string;
  overlay: string;
  secondary: string;
};

export const darkTheme: ThemeColors = {
  background: '#0A0E1A',
  backgroundCard: '#111827',
  backgroundElevated: '#1F2937',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
  border: 'rgba(255,255,255,0.08)',
  primary: '#E63946',
  success: '#10B981',
  error: '#EF4444',
  tabBarBg: '#111827',
  tabBarBorder: 'rgba(255,255,255,0.06)',
  inputBg: '#111827',
  inputBorder: 'rgba(255,255,255,0.1)',
  sectionBg: '#0F1623',
  overlay: 'rgba(0,0,0,0.7)',
  secondary: '#1D3557',
};

export const lightTheme: ThemeColors = {
  background: '#F8F9FA',
  backgroundCard: '#FFFFFF',
  backgroundElevated: '#F1F3F5',
  textPrimary: '#0A0A0A',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: 'rgba(0,0,0,0.08)',
  primary: '#E63946',
  success: '#059669',
  error: '#DC2626',
  tabBarBg: '#FFFFFF',
  tabBarBorder: 'rgba(0,0,0,0.06)',
  inputBg: '#F1F3F5',
  inputBorder: 'rgba(0,0,0,0.12)',
  sectionBg: '#F8F9FA',
  overlay: 'rgba(0,0,0,0.5)',
  secondary: '#1D3557',
};

type ThemeContextType = {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem('app_theme').then((stored) => {
      if (stored === 'light' || stored === 'dark') setModeState(stored);
    });
  }, []);

  const setMode = async (m: ThemeMode) => {
    setModeState(m);
    await AsyncStorage.setItem('app_theme', m);
  };

  const toggleTheme = () => setMode(mode === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{
      mode,
      colors: mode === 'dark' ? darkTheme : lightTheme,
      toggleTheme,
      setMode,
      isDark: mode === 'dark',
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
