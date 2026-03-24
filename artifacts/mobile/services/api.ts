import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://mota-be-v1-0-0-1.onrender.com/api';

const TOKEN_KEY = 'auth_token';

export async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } else {
    try {
      const SecureStore = await import('expo-secure-store');
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  }
}

export async function removeStoredToken() {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } else {
    try {
      const SecureStore = await import('expo-secure-store');
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      // ignore
    }
  }
}

const api = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const token = await getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await removeStoredToken();
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  verifyOtp: (data: any) => api.post('/auth/verify-otp', data),
  resendOtp: (data: any) => api.post('/auth/resend-otp', data),
};

// Driver
export const driverApi = {
  getDashboard: () => api.get('/driver/dashboard'),
  getProfile: () => api.get('/driver/profile'),
  updateProfile: (data: any) => api.put('/driver/update-profile', data),
  logRide: (data: any) => api.post('/driver/log-ride', data),
  getRides: (page = 1) => api.get(`/driver/rides?page=${page}`),
  getTier: () => api.get('/driver/tier'),
  getLeaderboard: (limit = 10) => api.get(`/driver/leaderboard?limit=${limit}`),
  requestFine: (data: any) => api.post('/driver/request-fine', data),
};

// Wallet
export const walletApi = {
  getBalance: () => api.get('/wallet/balance'),
  getTransactions: (page = 1) => api.get(`/wallet/transactions?page=${page}`),
  cashIn: (data: any) => api.post('/wallet/cash-in', data),
  cashOut: (data: any) => api.post('/wallet/cash-out', data),
};

// Loans
export const loansApi = {
  requestLoan: (data: any) => api.post('/loans/request', data),
  getMyLoans: () => api.get('/loans/my-loans'),
  repayLoan: (data: any) => api.post('/loans/repay', data),
};

// Notifications
export const notificationsApi = {
  getNotifications: (page = 1) => api.get(`/notifications?page=${page}`),
  getUnread: () => api.get('/notifications/unread'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  deleteNotification: (id: string) => api.delete(`/notifications/${id}`),
};

// Users
export const usersApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data: any) => api.put('/users/me', data),
};

// Payments
export const paymentApi = {
  requestPayment: (data: any) => api.post('/payment/request', data),
};
