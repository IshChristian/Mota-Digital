import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import axios from 'axios';
import { usersApi, algorithmApi, driverApi, authApi, getApiErrorMessage } from '../services/api';
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
  hasDriverProfile: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  register: (token: string, user: User) => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  fetchRiderStatus: () => Promise<RiderStatus | null>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
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
      await storeSensitiveJson('riderStatus', status);
      return status;
    } catch (err) {
      console.warn('Unable to refresh rider status', err);
      return null;
    }
  };

  /**
   * Check whether a driver profile exists on the backend for the current user.
   * If found, patch kycLevel to 'full' locally so the onboarding gate is skipped.
   */
  const checkDriverProfile = async (currentUser?: User | null) => {
    if (currentUser?.role?.trim().toLowerCase() !== 'driver') {
      setHasDriverProfile(false);
      return false;
    }

    try {
      const res = await driverApi.getProfile();
      const profile = res.data?.data || res.data?.profile || res.data;
      if (profile && (profile.plateNumber || profile.nid || profile._id)) {
        setHasDriverProfile(true);
        // Patch the local user so kycLevel gate is satisfied
        setUser((prev) => {
          if (!prev) return prev;
          const updated = { ...prev, kycLevel: 'full' };
          storeSensitiveJson('user', updated).catch((error) => console.warn('Unable to persist user profile', error));
          return updated;
        });
        return true;
      }
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 404) {
        console.warn('Unable to check driver profile', error);
      }
    }
    return false;
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
            const res = await usersApi.getMe();
            if (res.data?.user) {
              resolvedUser = res.data.user;
              setUser(resolvedUser);
              await storeSensitiveJson('user', resolvedUser);
            } else if (res.data?.data) {
              resolvedUser = res.data.data;
              setUser(resolvedUser);
              await storeSensitiveJson('user', resolvedUser);
            } else if (res.data) {
              resolvedUser = res.data;
              setUser(resolvedUser);
              await storeSensitiveJson('user', resolvedUser);
            }
            // If kycLevel is not yet 'full', verify against the actual driver profile
            if (resolvedUser?.role?.trim().toLowerCase() === 'driver' && resolvedUser.kycLevel !== 'full') {
              await checkDriverProfile(resolvedUser);
            } else if (resolvedUser?.role?.trim().toLowerCase() === 'driver' && resolvedUser.kycLevel === 'full') {
              setHasDriverProfile(true);
            } else {
              setHasDriverProfile(false);
            }
            // Fetch rider status in background after user data loads
            fetchRiderStatus();
          } catch (apiErr) {
            // Only a confirmed authentication failure invalidates the session.
            if (axios.isAxiosError(apiErr) && apiErr.response?.status === 401) {
              await clearSensitiveSession();
              setToken(null);
              setUser(null);
              setRiderStatus(null);
              setHasDriverProfile(false);
            } else {
              console.warn(`Unable to refresh session; using secure cached state. ${getApiErrorMessage(apiErr)}`);
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
    await storeToken(newToken);
    await storeSensitiveJson('user', newUser);
    setToken(newToken);
    setUser(newUser);
    // Await the profile check so hasDriverProfile is resolved before routing evaluates
    if (newUser.role?.trim().toLowerCase() !== 'driver') {
      setHasDriverProfile(false);
    } else if (newUser.kycLevel !== 'full') {
      await checkDriverProfile(newUser);
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
    await authApi.logout().catch((error) => console.warn('Unable to revoke remote session', error));
    await unregisterPushNotifications().catch((error) => console.warn('Unable to unregister push token', error));
    await clearSensitiveSession();
    setToken(null);
    setUser(null);
    setRiderStatus(null);
    setHasDriverProfile(false);
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
