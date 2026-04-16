import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usersApi } from '../services/api';

const TOKEN_KEY = 'auth_token';

async function storeToken(token: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } else {
    const SecureStore = await import('expo-secure-store');
    return await SecureStore.getItemAsync(TOKEN_KEY);
  }
}

async function removeToken() {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } else {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

type User = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: string;
  tier?: string;
  isVerified?: boolean;
  isEmailVerified?: boolean;
  isActive?: boolean;
  twoFactorEnabled?: boolean;
  kycLevel?: string;
  registrationPaid?: boolean;
  [key: string]: any;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  register: (token: string, user: User) => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAuth() {
      try {
        const storedToken = await getToken();
        if (storedToken) {
          setToken(storedToken);
          const userData = await AsyncStorage.getItem('user_data');
          if (userData) {
            setUser(JSON.parse(userData));
          }
          try {
            const res = await usersApi.getMe();
            if (res.data?.user) {
              setUser(res.data.user);
              await AsyncStorage.setItem('user_data', JSON.stringify(res.data.user));
            } else if (res.data) {
              setUser(res.data);
              await AsyncStorage.setItem('user_data', JSON.stringify(res.data));
            }
          } catch (apiErr) {
            // If token is invalid, clear it
            await removeToken();
            await AsyncStorage.removeItem('user_data');
            setToken(null);
            setUser(null);
          }
        }
      } catch (error) {
        await removeToken();
        await AsyncStorage.removeItem('user_data');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadAuth();
  }, []);

  const login = async (newToken: string, newUser: User) => {
    await storeToken(newToken);
    await AsyncStorage.setItem('user_data', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const register = async (newToken: string, newUser: User) => {
    await login(newToken, newUser);
  };

  const logout = async () => {
    await removeToken();
    await AsyncStorage.removeItem('user_data');
    setToken(null);
    setUser(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!token,
      isLoading,
      login,
      logout,
      register,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
