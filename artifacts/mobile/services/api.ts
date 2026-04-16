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
  payRegistration: (data: any) => api.post('/auth/pay-registration', data),
  registrationStatus: (data: any) => api.post('/auth/registration-status', data),
  logout: () => api.post('/auth/logout'),
};

// Driver
export const driverApi = {
  getDashboard: () => api.get('/driver/dashboard'),
  getProfile: () => api.get('/driver/profile'),
  updateProfile: (data: any) => api.put('/driver/update-profile', data),
  createProfile: (data: any) => api.post('/driver/create-profile', data),
  logRide: (data: any) => api.post('/driver/log-ride', data),
  getRides: (page = 1) => api.get(`/driver/rides?page=${page}`),
  getTier: () => api.get('/driver/tier'),
  getLeaderboard: (limit = 10) => api.get(`/driver/leaderboard?limit=${limit}`),
  payFine: (data: { fineId: string; paymentAmount: number }) => api.post('/driver/pay-fine', data),
  requestFine: (data: any) => api.post('/driver/request-fine', data),
};

// ─── MOTA Algorithm Engine ───────────────────────────────────────────────────
export const algorithmApi = {
  /** Process a completed ride through the Algorithm Engine */
  completeRide: () => api.post('/ride/complete'),

  /** Get rider algorithm status (tier, streak, rides, features, trophies) */
  getRiderStatus: () => api.get('/rider/status'),

  /** Get rider algorithm status by ID (admin) */
  getRiderStatusById: (id: string) => api.get(`/rider/status/${id}`),

  /** Get rider earnings (base pay, tier multiplier, daily/monthly estimated) */
  getRiderEarnings: () => api.get('/rider/earnings'),

  /** Get rider earnings by ID (admin) */
  getRiderEarningsById: (id: string) => api.get(`/rider/earnings/${id}`),
};

// ─── Fine Requests ───────────────────────────────────────────────────────────
export const fineRequestsApi = {
  /** Submit a fine request for admin approval */
  submit: (data: {
    fineId: string;
    amount: number;
    reason: string;
    attachments?: { url: string; description: string }[];
  }) => api.post('/fine-requests', data),

  /** Get my fine requests (driver) */
  getMine: (page = 1, limit = 20) =>
    api.get(`/fine-requests/my?page=${page}&limit=${limit}`),

  /** Get all fine requests (admin) */
  getAll: (params?: {
    status?: 'pending' | 'under_review' | 'approved' | 'rejected';
    driverId?: string;
    page?: number;
    limit?: number;
  }) => api.get('/fine-requests/all', { params }),

  /** Get a specific fine request by ID */
  getById: (id: string) => api.get(`/fine-requests/${id}`),
};

// Wallet
export const walletApi = {
  getBalance: () => api.get('/wallet/balance'),
  getTransactions: (page = 1) => api.get(`/wallet/transactions?page=${page}`),
  cashIn: (data: { amount: number; phone: string }) => api.post('/wallet/cash-in', data),
  cashOut: (data: { amount: number }) => api.post('/wallet/cash-out', data),
};

// Loans
export const loansApi = {
  // API requires { fineId } — loans are only issued against an active fine
  requestLoan: (data: { fineId: string }) => api.post('/loans/request', data),
  getMyLoans: () => api.get('/loans/my-loans'),
  repayLoan: (data: { loanId: string; amount: number }) => api.post('/loans/repay', data),
};

// Notifications
export const notificationsApi = {
  getNotifications: (page = 1) => api.get(`/notifications?page=${page}`),
  getUnread: (page = 1) => api.get(`/notifications/unread?page=${page}`),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  deleteNotification: (id: string) => api.delete(`/notifications/${id}`),
};

// Users
export const usersApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data: { firstName?: string; lastName?: string; email?: string }) =>
    api.put('/users/me', data),
  /**
   * Upload avatar via backend multipart endpoint.
   * The backend handles storage and returns the updated user with profileImage URL.
   */
  uploadAvatar: async (uri: string): Promise<{ profileImage: string }> => {
    const filename = uri.split('/').pop() || 'avatar.jpg';
    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

    const formData = new FormData();
    formData.append('avatar', { uri, name: filename, type: mimeType } as any);

    const token = await getStoredToken();
    const response = await fetch(`${API_BASE_URL}/users/avatar`, {
      method: 'POST',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        Accept: 'application/json',
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err || 'Avatar upload failed');
    }
    const data = await response.json();
    // Backend may return { user: { profileImage } } or { profileImage }
    return data?.user || data;
  },
};

// ─── Payments (Paypack) ──────────────────────────────────────────────────────
export const paymentApi = {
  /** Request ride payment from passenger via Paypack */
  requestPayment: (data: { passengerPhone: string; amount: number; rideId: string }) =>
    api.post('/payment/request', data),
};

// ─── Transfers (P2P) ────────────────────────────────────────────────────────
export const transferApi = {
  /** Send money to another user (direct transfer) */
  send: (data: { phone: string; amount: number; description?: string }) =>
    api.post('/transfer/send', data),

  /** Send money via QR code scan */
  sendViaQR: (data: { phone: string; amount: number; description?: string }) =>
    api.post('/transfer/send-qr', data),
};
