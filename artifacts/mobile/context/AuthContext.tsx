import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usersApi, algorithmApi, driverApi } from '../services/api';

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
  registrationStatus?: 'pending' | 'correction' | 'approved';
  [key: string]: any;
};

export type RiderStatus = {
  current_tier: string;
  daily_rides: number;
  monthly_rides: number;
  streak_days: number;
  daily_earnings: number;
  cycle_number: number;
  trophies: string[];
  features_unlocked: string[];
  fines: Array<{
    id: string;
    amount: number;
    reason: string;
    status: string;
    createdAt: string;
  }>;
  [key: string]: any;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  riderStatus: RiderStatus | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasDriverProfile: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  register: (token: string, user: User) => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  fetchRiderStatus: () => Promise<RiderStatus | null>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [riderStatus, setRiderStatus] = useState<RiderStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasDriverProfile, setHasDriverProfile] = useState(false);

  const fetchRiderStatus = async (): Promise<RiderStatus | null> => {
    try {
      const res = await algorithmApi.getRiderStatus();
      const status = res.data?.data || res.data;
      setRiderStatus(status);
      await AsyncStorage.setItem('rider_status', JSON.stringify(status));
      return status;
    } catch (err) {
      // Load cached if API fails
      try {
        const cached = await AsyncStorage.getItem('rider_status');
        if (cached) {
          const parsed = JSON.parse(cached);
          setRiderStatus(parsed);
          return parsed;
        }
      } catch {}
      return null;
    }
  };

  /**
   * Check whether a driver profile exists on the backend for the current user.
   * If found, patch kycLevel to 'full' locally so the onboarding gate is skipped.
   */
  const checkDriverProfile = async (currentUser?: User | null) => {
    try {
      const res = await driverApi.getProfile();
      const profile = res.data?.data || res.data?.profile || res.data;
      if (profile && (profile.plateNumber || profile.nid || profile._id)) {
        setHasDriverProfile(true);
        // Patch the local user so kycLevel gate is satisfied
        setUser((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, kycLevel: 'full' };
          AsyncStorage.setItem('user_data', JSON.stringify(updated));
          return updated;
        });
        return true;
      }
    } catch {
      // 404 or network error — profile doesn't exist yet
    }
    return false;
  };

  useEffect(() => {
    async function loadAuth() {
      try {
        const storedToken = await getToken();
        if (storedToken) {
          setToken(storedToken);
          const userData = await AsyncStorage.getItem('user_data');
          let resolvedUser: User | null = null;
          if (userData) {
            resolvedUser = JSON.parse(userData);
            setUser(resolvedUser);
          }
          // Load cached rider status
          const cachedStatus = await AsyncStorage.getItem('rider_status');
          if (cachedStatus) {
            setRiderStatus(JSON.parse(cachedStatus));
          }
          try {
            const res = await usersApi.getMe();
            if (res.data?.user) {
              resolvedUser = res.data.user;
              setUser(resolvedUser);
              await AsyncStorage.setItem('user_data', JSON.stringify(resolvedUser));
            } else if (res.data?.data) {
              resolvedUser = res.data.data;
              setUser(resolvedUser);
              await AsyncStorage.setItem('user_data', JSON.stringify(resolvedUser));
            } else if (res.data) {
              resolvedUser = res.data;
              setUser(resolvedUser);
              await AsyncStorage.setItem('user_data', JSON.stringify(resolvedUser));
            }
            // If kycLevel is not yet 'full', verify against the actual driver profile
            if (resolvedUser && resolvedUser.kycLevel !== 'full') {
              await checkDriverProfile(resolvedUser);
            } else if (resolvedUser && resolvedUser.kycLevel === 'full') {
              setHasDriverProfile(true);
            }
            // Fetch rider status in background after user data loads
            fetchRiderStatus();
          } catch (apiErr) {
            // If token is invalid, clear it
            await removeToken();
            await AsyncStorage.removeItem('user_data');
            await AsyncStorage.removeItem('rider_status');
            setToken(null);
            setUser(null);
            setRiderStatus(null);
            setHasDriverProfile(false);
          }
        }
      } catch (error) {
        await removeToken();
        await AsyncStorage.removeItem('user_data');
        await AsyncStorage.removeItem('rider_status');
        setToken(null);
        setUser(null);
        setRiderStatus(null);
        setHasDriverProfile(false);
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
    // Check if driver profile exists — if so, skip the "Complete Your Profile" screen
    if (newUser.kycLevel !== 'full') {
      checkDriverProfile(newUser);
    } else {
      setHasDriverProfile(true);
    }
    // Fetch rider status immediately after login
    fetchRiderStatus();
  };

  const register = async (newToken: string, newUser: User) => {
    await login(newToken, newUser);
  };

  const logout = async () => {
    await removeToken();
    await AsyncStorage.removeItem('user_data');
    await AsyncStorage.removeItem('rider_status');
    setToken(null);
    setUser(null);
    setRiderStatus(null);
    setHasDriverProfile(false);
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
      riderStatus,
      isAuthenticated: !!token,
      isLoading,
      hasDriverProfile,
      login,
      logout,
      register,
      updateUser,
      fetchRiderStatus,
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
