import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://mota-be-v1-0-0-1.onrender.com/api';

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
  async (response) => {
    if (response.config.method && ['post', 'put', 'patch', 'delete'].includes(response.config.method.toLowerCase())) {
      const url = response.config.url || '';
      let title = "Action Successful";
      let msg = "Your request was processed successfully.";

      let shouldLog = false;
      if (url.includes('/driver/log-ride')) {
        title = "Ride Logged"; msg = "You successfully logged a new ride."; shouldLog = true;
      } else if (url.includes('/loans/request')) {
        title = "Loan Requested"; msg = "Your fine loan request has been submitted."; shouldLog = true;
      } else if (url.includes('/loans/repay')) {
        title = "Loan Repaid"; msg = "Your loan repayment was successful."; shouldLog = true;
      } else if (url.includes('/auth/pay-registration')) {
        title = "Payment Processed"; msg = "Your account registration payment has been initiated."; shouldLog = true;
      } else if (url.includes('/driver/update-profile') || url.includes('/driver/create-profile')) {
        title = "Profile Updated"; msg = "Your profile information was saved."; shouldLog = true;
      } else if (url.includes('/transfer/send')) {
        title = "Transfer Sent"; msg = "Your money transfer was completed successfully."; shouldLog = true;
      } else if (url.includes('/auth/verify-otp')) {
        title = "Verification Complete"; msg = "Your phone has been verified successfully."; shouldLog = true;
      } else if (url.includes('/fine-requests')) {
        title = "Fine Request"; msg = "Your fine request was submitted."; shouldLog = true;
      } else if (url.includes('/wallet/cash-out')) {
        title = "Cash Out Requested"; msg = "Your cash-out request is pending approval."; shouldLog = true;
      } else if (url.includes('/wallet/cash-in')) {
        title = "Cash In Processed"; msg = "Money added to your wallet."; shouldLog = true;
      } else if (url.includes('/auth/resend-otp')) {
        title = "Code Sent"; msg = "A new verification code was sent to you."; shouldLog = true;
      } else if (url.includes('/auth/resend-email-otp')) {
        title = "Email Code Sent"; msg = "A new verification code was sent to your email."; shouldLog = true;
      } else if (url.includes('/auth/verify-email-otp')) {
        title = "Email Verified"; msg = "Your email has been verified successfully."; shouldLog = true;
      } else if (url.includes('/auth/submit-registration')) {
        title = "Registration Submitted"; msg = "Your registration has been submitted for admin review."; shouldLog = true;
      } else if (url.includes('/fuel-vouchers/claim-momo')) {
        title = "⛽ MoMo Fuel Claimed!"; msg = "1,000 RWF sent to your MTN MoMo. Dial *182*1525# at any pump."; shouldLog = true;
      } else if (url.includes('/fuel-vouchers/claim-qr')) {
        title = "⛽ QR Voucher Generated!"; msg = "Show your QR code at a Rubis station. Expires at 23:59 today."; shouldLog = true;
      }

      if (shouldLog) {
        try {
          const existingStr = await AsyncStorage.getItem("local_notifs");
          const existing = existingStr ? JSON.parse(existingStr) : [];
          existing.unshift({
            id: "local-" + Date.now(),
            title,
            message: msg,
            read: false,
            createdAt: new Date().toISOString()
          });
          await AsyncStorage.setItem("local_notifs", JSON.stringify(existing));
        } catch(e) {}
      }
    }
    return response;
  },
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
  resendEmailOtp: (data: { email: string }) => api.post('/auth/resend-email-otp', data),
  verifyEmailOtp: (data: { email: string; otp: string }) => api.post('/auth/verify-email-otp', data),
  payRegistration: (data: any) => api.post('/auth/pay-registration', data),
  registrationStatus: (data: any) => api.post('/auth/registration-status', data),
  /** Submit full registration request for admin review */
  submitRegistrationRequest: () => api.post('/auth/submit-registration'),
  /** Check current registration approval status */
  getRegistrationApproval: () => api.get('/auth/registration-approval'),
  /** 2FA Setup and Verify */
  setup2FA: () => api.post('/auth/2fa/setup'),
  verify2FA: (data: { userId: string; token: string }) => api.post('/auth/2fa/verify', data),
  logout: () => api.post('/auth/logout'),
};

// ─── Admin (Registration Approvals) ────────────────────────────────────────
export const adminApi = {
  /** Get all registration requests (admin only) */
  getAllRegistrations: (params?: {
    status?: 'pending' | 'correction' | 'approved';
    page?: number;
    limit?: number;
  }) => api.get('/admin/registrations', { params }),

  /** Get a specific registration request by user ID */
  getRegistrationById: (userId: string) => api.get(`/admin/registrations/${userId}`),

  /** Update registration status (admin only) */
  updateRegistrationStatus: (userId: string, data: {
    status: 'pending' | 'correction' | 'approved';
    rejectionReason?: string;
  }) => api.put(`/admin/registrations/${userId}/status`, data),
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
  updateAvailability: (data: { isOnline: boolean }) => api.put('/driver/availability', data),
  updateLocation: (data: { latitude: number; longitude: number }) => api.put('/driver/location', data),
  getActiveRide: () => api.get('/driver/active-ride'),
};

// ─── Rides API ───────────────────────────────────────────────────────────────
export const ridesApi = {
  // Driver-side
  acceptRide: (id: string) => api.post(`/rides/${id}/accept`),
  declineRide: (id: string) => api.post(`/rides/${id}/decline`),
  getRideDetails: (id: string) => api.get(`/rides/${id}`),
  notifyArrival: (id: string) => api.post(`/rides/${id}/arrived`),
  startRide: (id: string, pin: string) => api.post(`/rides/${id}/start`, { pin }),
  completeRide: (id: string) => api.post(`/rides/${id}/complete`),
  // Passenger-side
  requestRide: (data: { pickup: any; destination: any; offeredFare: number; backupDrivers: number }) =>
    api.post('/rides/request', data),
  getMyRides: (page = 1) => api.get(`/rides/my-rides?page=${page}`),
  cancelRide: (id: string) => api.post(`/rides/${id}/cancel`),
  rateRide: (id: string, data: { rating: number; comment?: string }) =>
    api.post(`/rides/${id}/rate`, data),
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
  // API requires { tinNumber, ticketNumber }
  requestLoan: (data: { tinNumber: string; ticketNumber: string }) => api.post('/loans/request', data),
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

  /** Check payment status manually (Polling fallback) */
  checkPaymentStatus: (ref: string) => api.get(`/payment/status/${ref}`),
};

// ─── Transfers (P2P) ────────────────────────────────────────────────────────
export const transferApi = {
  /** Send money to another user (direct transfer) */
  send: (data: { phone: string; amount: number; description?: string }) =>
    api.post('/transfer/send', data),

  /** Send money via QR code scan */
  sendViaQR: (data: { phone: string; amount: number; description?: string }) =>
    api.post('/transfer/send-qr', data),

  /** Generate QR code for receiving payments */
  getQRCode: (amount?: number) =>
    api.get(`/transfer/qr-code${amount ? `?amount=${amount}` : ''}`),

  /** Get transfer history */
  getHistory: (page = 1, limit = 20) =>
    api.get(`/transfer/history?page=${page}&limit=${limit}`),
};

// ─── Fuel Vouchers (Tier 3+) ────────────────────────────────────────────────
export const fuelVoucherApi = {
  /** Claim a MoMo fuel voucher (1k RWF to MoMo for 1525#) */
  claimMoMo: () => api.post('/fuel-vouchers/claim-momo'),

  /** Generate a QR fuel voucher for Rubis stations */
  claimQR: () => api.post('/fuel-vouchers/claim-qr'),

  /** Get today's voucher usage/limits */
  getDailyStatus: () => api.get('/fuel-vouchers/daily-status'),

  /** Get voucher history */
  getHistory: (page = 1, limit = 20) =>
    api.get(`/fuel-vouchers/history?page=${page}&limit=${limit}`),

  /** Get weekly savings summary */
  getWeeklySavings: () => api.get('/fuel-vouchers/weekly-savings'),

  /** Get nearby fuel stations */
  getNearbyStations: (lat: number, lng: number, filter?: 'all' | 'rubis') =>
    api.get(`/fuel-vouchers/stations?lat=${lat}&lng=${lng}${filter ? `&filter=${filter}` : ''}`),

  /** Mark a voucher as redeemed */
  markRedeemed: (voucherId: string) =>
    api.patch(`/fuel-vouchers/${voucherId}/redeem`),
};

// ─── Rides ──────────────────────────────────────────────────────────────────
export const rideApi = {
  /** Get ride details by ID */
  getById: (id: string) => api.get(`/ride/${id}`),
};

// ─── Search ─────────────────────────────────────────────────────────────────
export const searchApi = {
  /** Universal search (drivers, rides, transactions) */
  searchAll: (q: string) => api.get(`/search?q=${encodeURIComponent(q)}`),
  /** Search specifically for users */
  searchUsers: (q: string) => api.get(`/search/users?q=${encodeURIComponent(q)}`),
};

// ─── Uploads ────────────────────────────────────────────────────────────────
export const uploadsApi = {
  /** Upload a new file (requires FormData) */
  upload: (data: FormData) =>
    api.post('/uploads', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  /** Get upload metadata by ID */
  getById: (id: string) => api.get(`/uploads/${id}`),
  /** Delete an uploaded file */
  delete: (id: string) => api.delete(`/uploads/${id}`),
};

// ─── Finance ─────────────────────────────────────────────────────────────────
export const financeApi = {
  getEligibility: () => api.get('/finance/eligibility'),
  getRiskScore: () => api.get('/finance/risk-score'),
  getLoanSchedule: (id: string) => api.get(`/finance/loans/${id}/schedule`),
  getSavingsStatus: () => api.get('/finance/savings/status'),
  depositSavings: (data: { amount: number }) => api.post('/finance/savings/deposit', data),
  withdrawSavings: (data: { amount: number }) => api.post('/finance/savings/withdraw', data),
  getMigrationStage: () => api.get('/finance/migration-stage'),
  getConsent: () => api.get('/finance/consent'),
  signConsent: (data: { consentType: string; version: string }) => api.post('/finance/consent', data),
};
