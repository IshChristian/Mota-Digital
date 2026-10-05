import { createDriverAutoOnline } from '../services/driverAutoOnline';
import { Alert } from '../components/GlobalAlert';
import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import axios from 'axios';
import { usersApi, driverApi, algorithmApi, authApi, getApiErrorMessage } from '../services/api';
import {
  clearSensitiveSession,
  getSensitiveJson,
  getStoredToken,
  storeSensitiveJson,
  storeToken,
} from '../services/secureStorage';
import { unregisterPushNotifications } from '../services/pushNotifications';

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
  isAccountReady: boolean;
  accountError: string;
  refreshAccount: () => Promise<User>;
  hasDriverProfile: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  register: (token: string, user: User) => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  fetchRiderStatus: () => Promise<RiderStatus | null>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const autoOnline = useRef<ReturnType<typeof createDriverAutoOnline> | null>(null);
  if (!autoOnline.current) autoOnline.current = createDriverAutoOnline();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [riderStatus, setRiderStatus] = useState<RiderStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccountReady, setIsAccountReady] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [hasDriverProfile, setHasDriverProfile] = useState(false);

  const fetchRiderStatus = async (): Promise<RiderStatus | null> => {
    try {
      const expectedToken = await getStoredToken();
      const res = await algorithmApi.getRiderStatus();
      if (!expectedToken || await getStoredToken() !== expectedToken) return null;
      const status = res.data?.data || res.data;
      setRiderStatus(status);
      await storeSensitiveJson('riderStatus', status);
      return status;
    } catch (err) {
      console.warn('Unable to refresh rider status', err);
      return null;
    }
  };

  const refreshAccount = async (): Promise<User> => {
    const expectedToken = await getStoredToken();
    try {
      if (!expectedToken) throw new Error('Sign in to continue.');
      const response = await usersApi.getMe();
      const account = response.data?.data || response.data?.user || response.data;
      if (!(account?.id || account?._id) || !account?.role) throw new Error('Account information is incomplete. Please retry.');
      if (await getStoredToken() !== expectedToken) throw new Error('Your session changed. Please sign in again.');
      const resolved = { ...account, id: String(account.id || account._id) };
      try {
        const online = await autoOnline.current!.run(resolved, expectedToken, getStoredToken, () => driverApi.updateAvailability({ isOnline: true, automatic: true }));
        if (online === true) resolved.isOnline = true;
      } catch (error) {
        if (await getStoredToken() === expectedToken) Alert.alert('Unable to go online automatically', getApiErrorMessage(error));
      }
      if (await getStoredToken() !== expectedToken) throw new Error('Your session changed. Please sign in again.');
      await storeSensitiveJson('user', resolved);
      setUser(resolved);
      setHasDriverProfile(resolved.hasDriverProfile === true);
      setAccountError('');
      setIsAccountReady(true);
      if (resolved.role === 'driver' && resolved.isActive && resolved.isVerified && resolved.registrationPaid) void fetchRiderStatus();
      return resolved;
    } catch (error) {
      if (expectedToken && await getStoredToken() === expectedToken) {
        setAccountError(getApiErrorMessage(error));
        setIsAccountReady(false);
      }
      throw error;
    }
  };

  useEffect(() => {
    async function loadAuth() {
      try {
        const storedToken = await getStoredToken();
        if (storedToken) {
          setToken(storedToken);
          let resolvedUser = await getSensitiveJson<User>('user');
          if (resolvedUser) setUser(resolvedUser);
          const cachedStatus = await getSensitiveJson<RiderStatus>('riderStatus');
          if (cachedStatus) setRiderStatus(cachedStatus);
          try {
            await refreshAccount();
          } catch (apiErr) {
            // Only a confirmed authentication failure invalidates the session.
            if (axios.isAxiosError(apiErr) && apiErr.response?.status === 401) {
              await clearSensitiveSession();
              setToken(null);
              setUser(null);
              setRiderStatus(null);
              setHasDriverProfile(false);
            } else {
              console.warn(`Unable to refresh session; account refresh is required before continuing. ${getApiErrorMessage(apiErr)}`);
            }
          }
        }
      } catch (error) {
        console.warn('Unable to restore secure session', error);
        await clearSensitiveSession();
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
    autoOnline.current!.reset();
    await storeToken(newToken);
    setRiderStatus(null);
    await storeSensitiveJson('riderStatus', null);
    await storeSensitiveJson('user', newUser);
    setToken(newToken);
    setUser(newUser);
    setIsAccountReady(false);
    await refreshAccount().catch(() => { /* Welcome displays the refresh error and retry action. */ });
  };

  const register = async (newToken: string, newUser: User) => {
    await login(newToken, newUser);
  };

  const logout = async () => {
    autoOnline.current!.reset();
    await authApi.logout().catch((error) => console.warn('Unable to revoke remote session', error));
    await unregisterPushNotifications().catch((error) => console.warn('Unable to unregister push token', error));
    await clearSensitiveSession();
    setToken(null);
    setUser(null);
    setRiderStatus(null);
    setHasDriverProfile(false);
    setIsAccountReady(false);
    setAccountError('');
  };

  const updateUser = async (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      await storeSensitiveJson('user', updatedUser);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      riderStatus,
      isAuthenticated: !!token,
      isLoading,
      isAccountReady,
      accountError,
      refreshAccount,
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
