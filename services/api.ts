import { uploadFile } from "./fileUpload";
import axios from "axios";
import { getStoredToken, removeStoredToken } from "./secureStorage";

export const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_BASE_URL ||
    "https://mota-be-v1-0-0-1.onrender.com/api").replace(/\/+$/, "");

export { getStoredToken, removeStoredToken } from "./secureStorage";

const api = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });

const sessionExpiredListeners = new Set<() => void>();
/** Lets AuthContext sign the user out in memory when the server rejects their token. */
export function onSessionExpired(listener: () => void) {
  sessionExpiredListeners.add(listener);
  return () => { sessionExpiredListeners.delete(listener); };
}

export const isNetworkError = (error: unknown) =>
  axios.isAxiosError(error) && !error.response;

export const getApiErrorMessage = (error: unknown) => {
  if (isNetworkError(error)) {
    return `Cannot reach MOTA services at ${API_BASE_URL}. Check internet access and retry.`;
  }
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || "Request failed.";
  }
  return error instanceof Error ? error.message : "Request failed.";
};

export const createIdempotencyKey = (operation: string) =>
  `${operation.slice(0, 3)}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

api.interceptors.request.use(async (config) => {
  const token = await getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as
      | (typeof error.config & { _networkRetryCount?: number })
      | undefined;
    const method = config?.method?.toLowerCase();
    const retryCount = config?._networkRetryCount || 0;
    // Retry only read-only requests. Financial POST requests are never retried
    // automatically and rely on their Idempotency-Key instead.
    if (!error.response && config && ["get", "head"].includes(method || "") && retryCount < 2) {
      config._networkRetryCount = retryCount + 1;
      await new Promise((resolve) => setTimeout(resolve, 750 * config._networkRetryCount!));
      return api.request(config);
    }
    if (error.response?.status === 401 && config?.headers?.Authorization) {
      await removeStoredToken();
      sessionExpiredListeners.forEach((listener) => listener());
    }
    return Promise.reject(error);
  },
);

export default api;

// Auth
export const authApi = {
  register: (data: any) => api.post("/auth/register", data),
  recoverRegistration: (data: { phone: string; password: string }) => api.post("/auth/recover-registration", data),
  login: (data: any) => api.post("/auth/login", data),
  verifyOtp: (data: any) => api.post("/auth/verify-otp", data),
  resendOtp: (data: any) => api.post("/auth/resend-otp", data),
  resendEmailOtp: (data: { email: string }) =>
    api.post("/auth/resend-email-otp", data),
  verifyEmailOtp: (data: { email: string; otp: string }) =>
    api.post("/auth/verify-email", data),
  payRegistration: (data: any) => api.post("/auth/pay-registration", data),
  registrationStatus: (data: any) =>
    api.post("/auth/registration-status", data),
  /** Submit full registration request for admin review */
  submitRegistrationRequest: () => api.post("/auth/submit-registration"),
  /** Check current registration approval status */
  getRegistrationApproval: () => api.get("/auth/registration-approval"),
  /** 2FA Setup and Verify */
  setup2FA: () => api.post("/auth/2fa/setup"),
  verify2FA: (data: { userId: string; token: string }) =>
    api.post("/auth/2fa/verify", data),
  logout: () => api.post("/auth/logout"),
  forgotPassword: (email: string) =>
    api.post("/auth/forgot-password", { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post("/auth/reset-password", { token, newPassword }),
};

// ─── Admin (Registration Approvals) ────────────────────────────────────────
export const adminApi = {
  /** Get all registration requests (admin only) */
  getAllRegistrations: (params?: {
    status?: "pending" | "correction" | "approved";
    page?: number;
    limit?: number;
  }) => api.get("/admin/registrations/pending", { params }),

  /** Get a specific registration request by user ID */
  getRegistrationById: (userId: string) =>
    api.get(`/admin/registrations/${userId}`),

  /** Update registration status (admin only) */
  updateRegistrationStatus: (
    userId: string,
    data: {
      status: "pending" | "correction" | "approved";
      rejectionReason?: string;
    },
  ) => api.put(`/admin/registrations/${userId}/status`, data),
};

// Driver
export const driverApi = {
  getPerformance: (days = 30) => api.get("/driver/performance", { params: { days } }),
  acknowledgeOffer: (rideId: string) => api.post(`/driver/offers/${rideId}/received`),
  getDashboard: () => api.get("/driver/dashboard"),
  getProfile: () => api.get("/driver/profile"),
  updateProfile: (data: any) => api.put("/driver/update-profile", data),
  createProfile: (data: any) => api.post("/driver/create-profile", data),
  logRide: (data: any) => api.post("/driver/log-ride", data),
  getRides: (page = 1) => api.get(`/driver/rides?page=${page}`),
  getTier: () => api.get("/driver/tier"),
  getLeaderboard: (limit = 10) => api.get(`/driver/leaderboard?limit=${limit}`),
  payFine: (data: { fineId: string; paymentAmount: number }) =>
    api.post("/driver/pay-fine", data),
  requestFine: (data: any) => api.post("/driver/request-fine", data),
  updateAvailability: (data: { isOnline: boolean; automatic?: boolean }) =>
    api.put("/driver/availability", data),
  updateLocation: (data: { latitude: number; longitude: number; heading?: number; speed?: number }) =>
    api.put("/driver/location", data),
  getActiveRide: () => api.get("/driver/active-ride"),
  getPreferences: () => api.get<{ data: { requestRadiusKm: number | null; systemRadiusKm: number; minKm: number; maxKm: number } }>("/driver/preferences"),
  updatePreferences: (data: { requestRadiusKm: number | null }) => api.put("/driver/preferences", data),
};

// ─── Rides API ───────────────────────────────────────────────────────────────
export type VehicleType = "motor" | "car";
export type PaymentMethod = "cash" | "momo" | "wallet";
export type Place = { name: string; address?: string; latitude: number; longitude: number };
export type ParcelDetails = { recipientName: string; recipientPhone: string; description?: string; size?: "small" | "medium" | "large"; weightKg?: number };
export type RouteStep = { instruction: string; maneuver: string; distanceMeters: number };
export type RouteResult = { source: "google" | "osm"; encodedPolyline: string; distanceMeters: number; durationSeconds: number; steps: RouteStep[] };
/** Accepts every estimate shape the backends send and returns the options list (may be empty). */
export function normalizeEstimate(body: any): FareOption[] {
  const list = body?.data?.options ?? body?.options;
  if (Array.isArray(list) && list.length) return list;
  const single = body?.data?.suggestedFare != null ? body.data : body;
  if (single && Number.isFinite(Number(single.suggestedFare))) {
    return [{
      vehicleType: single.vehicleType === "car" ? "car" : "motor",
      distanceKm: Number(single.distanceKm) || 0,
      durationMinutes: Number(single.durationMinutes) || 0,
      minimumFare: Number(single.minimumFare ?? single.suggestedFare),
      maximumFare: Number(single.maximumFare ?? single.suggestedFare),
      suggestedFare: Number(single.suggestedFare),
      encodedPolyline: single.encodedPolyline ?? null,
      routeSource: single.routeSource === "google" || single.routeSource === "osm" || single.distanceSource === "road" ? "google" : "estimate",
    }];
  }
  return [];
}

export type FareOption = { vehicleType: VehicleType; distanceKm: number; durationMinutes: number; minimumFare: number; maximumFare: number; suggestedFare: number; encodedPolyline?: string | null; routeSource: "google" | "estimate" };

export const ridesApi = {
  // Driver-side
  acceptRide: (id: string) => api.post(`/rides/${id}/accept`),
  declineRide: (id: string) => api.post(`/rides/${id}/decline`),
  counterOffer: (id: string, amount: number) => api.post(`/rides/${id}/counter-offer`, { amount }),
  getRideDetails: (id: string) => api.get(`/rides/${id}`),
  notifyArrival: (id: string) => api.post(`/rides/${id}/arrived`),
  startRide: (id: string, pin: string) =>
    api.post(`/rides/${id}/start`, { pin }),
  completeRide: (id: string) => api.post(`/rides/${id}/complete`),
  // Passenger-side
  requestRide: (data: {
    pickup: Place;
    destination: Place;
    vehicleType: VehicleType;
    rideType?: "ride" | "parcel";
    parcel?: ParcelDetails;
    offeredFare: number;
    backupDrivers: number;
    passengers?: number;
    paymentMethod: PaymentMethod;
    scheduledDate?: string;
    scheduledTime?: string;
  }) => api.post("/rides/request", data),
  estimateFare: (
    pickup: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    options: { vehicleType?: VehicleType; rideType?: "ride" | "parcel" } = {},
  ) => api.post("/rides/estimate", { pickup, destination, ...options }),
  /**
   * Prices every vehicle option. Newer servers return data.options = [motor, car];
   * older ones return a single moto estimate, which becomes a one-item list.
   * Always resolves to { data: { data: { options } } } so screens never read undefined.
   */
  estimateOptions: async (
    pickup: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    rideType: "ride" | "parcel" = "ride",
  ) => {
    const res = await api.post("/rides/estimate", { pickup, destination, rideType });
    return { ...res, data: { data: { options: normalizeEstimate(res.data) } } };
  },
  getActiveRide: () => api.get("/rides/active"),
  getMyRides: (page = 1) => api.get(`/rides/my-rides?page=${page}`),
  getDriverRequests: () => api.get("/rides/driver/requests"),
  getRideStatus: (id: string) => api.get(`/rides/${id}/status`),
  cancelRide: (id: string, reason?: string) =>
    api.post(`/rides/${id}/cancel`, { reason }),
  rateRide: (id: string, data: { rating: number; comment?: string; tip?: number }) =>
    api.post(`/rides/${id}/rating`, data),
  raiseOffer: (id: string, amount: number) => api.post(`/rides/${id}/raise-offer`, { amount }),
  acceptCounterOffer: (id: string, offerId: string) => api.post(`/rides/${id}/counter-offers/${offerId}/accept`),
  requestStart: (id: string) => api.post(`/rides/${id}/request-start`),
  confirmStart: (id: string) => api.post(`/rides/${id}/confirm-start`),
  requestStop: (id: string, deliveryPin?: string) => api.post(`/rides/${id}/request-stop`, deliveryPin ? { deliveryPin } : {}),
  confirmStop: (id: string) => api.post(`/rides/${id}/confirm-stop`),
  claimFare: (id: string) => api.post(`/rides/${id}/claim-fare`),
  payRide: (id: string, phone?: string) => api.post(`/rides/${id}/pay`, phone ? { phone } : {}),
  share: (id: string) => api.post<{ data: { url: string; expiresAt: string } }>(`/rides/${id}/share`),
  getMessages: (id: string) => api.get(`/rides/${id}/messages`),
  sendMessage: (id: string, text: string) => api.post(`/rides/${id}/messages`, { text }),
  call: (id: string) => api.post<{ data: { mode: "direct" | "bridged"; phone?: string; message?: string } }>(`/rides/${id}/call`),
};

/** Direct OpenStreetMap (Nominatim) search, used only when the MOTA server can't search. */
async function searchOpenStreetMap(q: string): Promise<Place[]> {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&countrycodes=rw&limit=10`, {
    headers: { Accept: "application/json", "User-Agent": "MOTA-App/1.0 (support@mota.africa)" },
  });
  if (!response.ok) throw new Error("Place search is unavailable. Tap the map to choose a place.");
  const rows: any[] = await response.json();
  return rows.map((r) => ({
    name: String(r.display_name || "").split(",")[0].trim(),
    address: String(r.display_name || "").split(",").slice(1).join(",").trim(),
    latitude: Number(r.lat),
    longitude: Number(r.lon),
  })).filter((p) => p.name && Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
}

export const mapsApi = {
  /** Road route: Google Routes first, OpenStreetMap (OSRM) when Google fails or finds nothing. */
  getRoute: (
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
  ) => api.post<{ data: RouteResult }>("/maps/route", { origin, destination, travelMode: "DRIVE" }),
  /**
   * Place search through MOTA's server (cached). If the server has no search route
   * (older backend → 404) or can't be reached, search OpenStreetMap directly.
   */
  search: async (q: string, near?: { latitude: number; longitude: number }): Promise<{ data: { data: Place[] } }> => {
    try {
      const res = await api.get("/maps/search", { params: { q, lat: near?.latitude, lng: near?.longitude } });
      if (Array.isArray(res.data?.data)) return { data: { data: res.data.data } };
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status && status !== 404 && status !== 503) throw error;
    }
    return { data: { data: await searchOpenStreetMap(q) } };
  },
  reverse: (point: { latitude: number; longitude: number }) =>
    api.get<{ data: Place }>("/maps/reverse", { params: { lat: point.latitude, lng: point.longitude } }),
};

export const placesApi = {
  list: () => api.get<{ data: { saved: Array<Place & { _id: string; label: string }>; recent: Place[] } }>("/users/me/places"),
  save: (place: Place & { label: string }) => api.post("/users/me/places", place),
  remove: (id: string) => api.delete(`/users/me/places/${id}`),
};

export const emergencyContactsApi = {
  list: () => api.get<{ data: Array<{ _id: string; name: string; phone: string; relationship?: string }> }>("/users/me/emergency-contacts"),
  add: (data: { name: string; phone: string; relationship?: string }) => api.post("/users/me/emergency-contacts", data),
  remove: (id: string) => api.delete(`/users/me/emergency-contacts/${id}`),
};

// ─── MOTA Algorithm Engine ───────────────────────────────────────────────────
export const algorithmApi = {
  /** Process a completed ride through the Algorithm Engine */
  completeRide: () => api.post("/ride/complete"),

  /** Get rider algorithm status (tier, streak, rides, features, trophies) */
  getRiderStatus: () => api.get("/rider/status"),

  /** Get rider algorithm status by ID (admin) */
  getRiderStatusById: (id: string) => api.get(`/rider/status/${id}`),

  /** Get rider earnings (base pay, tier multiplier, daily/monthly estimated) */
  getRiderEarnings: () => api.get("/rider/earnings"),

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
  }) => api.post("/fine-requests", data),

  /** Get my fine requests (driver) */
  getMine: (page = 1, limit = 20) =>
    api.get(`/fine-requests/my?page=${page}&limit=${limit}`),

  /** Get all fine requests (admin) */
  getAll: (params?: {
    status?: "pending" | "under_review" | "approved" | "rejected";
    driverId?: string;
    page?: number;
    limit?: number;
  }) => api.get("/fine-requests/all", { params }),

  /** Get a specific fine request by ID */
  getById: (id: string) => api.get(`/fine-requests/${id}`),
};

// Wallet
export const walletApi = {
  getBalance: () => api.get("/wallet/balance"),
  getTransactions: (page = 1) => api.get(`/wallet/transactions?page=${page}`),
  getWithdrawals: () => api.get("/wallet/withdrawals"),
  cashIn: (data: { amount: number; phone: string }, idempotencyKey: string) =>
    api.post("/wallet/cash-in", data, {
      headers: { "Idempotency-Key": idempotencyKey },
    }),
  cashOut: (data: { amount: number }, idempotencyKey: string) =>
    api.post("/wallet/cash-out", data, {
      headers: { "Idempotency-Key": idempotencyKey },
    }),
};

// Loans
export const loansApi = {
  // API requires { tinNumber, ticketNumber }
  requestLoan: (data: { tinNumber: string; ticketNumber: string }) =>
    api.post("/loans/request", data),
  getMyLoans: () => api.get("/loans/my-loans"),
  repayLoan: (data: { loanId: string; amount: number }) =>
    api.post("/loans/repay", data),
};

// Notifications
export const notificationsApi = {
  getNotifications: (page = 1) => api.get(`/notifications?page=${page}`),
  getUnread: (page = 1) => api.get(`/notifications/unread?page=${page}`),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  deleteNotification: (id: string) => api.delete(`/notifications/${id}`),
  registerPushToken: (token: string, platform: "android" | "ios") =>
    api.post("/notifications/push-token", { token, platform }),
  unregisterPushToken: (token: string) =>
    api.delete("/notifications/push-token", { data: { token } }),
};

// Users
export const usersApi = {
  getMe: () => api.get("/users/me"),
  updateMe: (data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    preferredPayment?: "CASH" | "MOMO" | "CARD";
    preferredLanguage?: "en" | "rw" | "fr" | "sw";
  }) => api.put("/users/me", data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/users/me/change-password", { currentPassword, newPassword }),
  exportMyData: () => api.get("/users/me/export"),
  requestContactChange: (type: "phone" | "email", value: string) =>
    api.post("/users/me/contact-change/request", { type, value }),
  verifyContactChange: (otp: string) =>
    api.post("/users/me/contact-change/verify", { otp }),
  deleteAccount: (password: string) =>
    api.delete("/users/account", { data: { password } }),
  /** Upload directly to Cloudinary, then save the confirmed URL on the user. */
  uploadAvatar: async (uri: string, base64?: string | null, filename?: string, mimeType?: string): Promise<{ avatarUrl: string }> => {
    const uploaded = await uploadFile('', 'file', uri, filename, mimeType, base64);
    const response = await api.put('/users/me', { avatarUrl: uploaded.data.url });
    const updated = response.data?.data;
    if (!updated?.avatarUrl) throw new Error('Photo uploaded, but the profile could not be updated. Please retry.');
    return updated;
  },
};

export const realtimeApi = {
  updateLocation: (data: {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
  }) => api.post("/realtime/location", data),
  getNearbyDrivers: (lat: number, lng: number, radius = 3, vehicleType?: VehicleType) =>
    api.get("/realtime/nearby-drivers", { params: { lat, lng, radius, vehicleType } }),
};

export const productionApi = {
  status: () => api.get("/production/status"),
  sessions: () => api.get("/production/sessions"),
  revokeSession: (id: string) => api.delete(`/production/sessions/${id}`),
  paymentMethods: () => api.get("/production/payment-methods"),
  addPaymentMethod: (data: {
    type: "momo" | "cash";
    label: string;
    phone?: string;
  }) => api.post("/production/payment-methods", data),
  verifyPaymentMethod: (id: string, otp: string) =>
    api.post(`/production/payment-methods/${id}/verify`, { otp }),
  defaultPaymentMethod: (id: string) =>
    api.post(`/production/payment-methods/${id}/default`),
  removePaymentMethod: (id: string) =>
    api.delete(`/production/payment-methods/${id}`),
  safetyEvents: () => api.get("/production/safety-events"),
  createSafetyEvent: (data: Record<string, unknown>) =>
    api.post("/production/safety-events", data),
  disputes: () => api.get("/production/disputes"),
  createDispute: (rideId: string, data: Record<string, unknown>) =>
    api.post(`/production/rides/${rideId}/disputes`, data),
  createDisputeByPlate: (plateNumber: string, data: Record<string, unknown>) =>
    api.post("/production/disputes/by-plate", { ...data, plateNumber }),
  replyDispute: (id: string, message: string) =>
    api.post(`/production/disputes/${id}/replies`, { message }),
  notificationPreferences: () =>
    api.get("/production/notification-preferences"),
  updateNotificationPreferences: (data: Record<string, boolean>) =>
    api.put("/production/notification-preferences", data),
  consents: () => api.get("/production/consents"),
  recordConsent: (data: {
    type: string;
    version: string;
    granted: boolean;
    source?: string;
  }) => api.post("/production/consents", data),
};

export type KycStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "correction"
  | "rejected"
  | "not_submitted";
export const kycApi = {
  getMine: () => api.get("/kyc/me"),
  submitMine: (data: Record<string, string>) => api.put("/kyc/me", data),
};

export const driverFinanceApi = {
  getSummary: () => api.get("/driver-finance/summary"),
  getTransactions: (params?: {
    limit?: number;
    type?: string;
    before?: string;
  }) => api.get("/driver-finance/transactions", { params }),
};

// ─── Payments (Paypack) ──────────────────────────────────────────────────────
export const paymentApi = {
  /** Request ride payment from passenger via Paypack */
  requestPayment: (data: {
    passengerPhone: string;
    amount: number;
    rideId: string;
  }) => api.post("/payment/request", data),

  /** Check payment status manually (Polling fallback) */
  checkPaymentStatus: (ref: string) => api.get(`/payment/status/${ref}`),
};

// ─── Transfers (P2P) ────────────────────────────────────────────────────────
export const transferApi = {
  /** Send money to another user (direct transfer) */
  send: (data: { phone: string; amount: number; description?: string }) =>
    api.post("/transfer/send", data),

  /** Send money via QR code scan */
  sendViaQR: (data: { phone: string; amount: number; description?: string }) =>
    api.post("/transfer/send-qr", data),

  /** Generate QR code for receiving payments */
  getQRCode: (amount?: number) =>
    api.get(`/transfer/qr-code${amount ? `?amount=${amount}` : ""}`),

  /** Get transfer history */
  getHistory: (page = 1, limit = 20) =>
    api.get(`/transfer/history?page=${page}&limit=${limit}`),
};

// ─── Fuel Vouchers (Tier 3+) ────────────────────────────────────────────────
export const fuelVoucherApi = {
  /** Submit a MoMo fuel support request. */
  claimMoMo: (key?: string) => api.post("/fuel-vouchers/claim-momo", {}, { headers: key ? { "Idempotency-Key": key } : {} }),

  /** Request a QR voucher for approved MOTA partners. */
  claimQR: (key?: string) => api.post("/fuel-vouchers/claim-qr", {}, { headers: key ? { "Idempotency-Key": key } : {} }),
  getVoucher: (id: string) => api.get(`/fuel-vouchers/${id}`),
  getStations: () => api.get("/fuel-vouchers/stations"),

  /** Get today's voucher usage/limits */
  getDailyStatus: () => api.get("/fuel-vouchers/daily-status"),

  /** Get voucher history */
  getHistory: (page = 1, limit = 20) =>
    api.get(`/fuel-vouchers/history?page=${page}&limit=${limit}`),

  /** Get weekly savings summary */
  getWeeklySavings: () => api.get("/fuel-vouchers/weekly-savings"),

  /** Get nearby fuel stations */
  getNearbyStations: (lat: number, lng: number, filter?: "all" | "rubis") =>
    api.get(
      `/fuel-vouchers/stations?lat=${lat}&lng=${lng}${filter ? `&filter=${filter}` : ""}`,
    ),

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
  searchUsers: (q: string) =>
    api.get(`/search/users?q=${encodeURIComponent(q)}`),
};

export const releaseApi = {
  getLatest: () => api.get<{ version: string | null; downloaderUrl: string | null; websiteUrl: string | null }>("/platform/mobile-release"),
};

export const agentApi = {
  stats: () => api.get("/agent/stats"),
  drivers: () => api.get("/agent/drivers", { params: { limit: 100 } }),
  updateRequests: () => api.get("/agent/update-requests"),
  registerDriver: (data: { firstName: string; lastName: string; phone: string; nationalId: string }) => api.post("/agent/register-driver", data),
  requestDriverUpdate: (id: string, description: string, kind: "profile_update" | "kyc_help" | "fee_help" | "account_access") => api.post(`/agent/drivers/${id}/update-request`, { description, kind }),
};

// ─── Uploads ────────────────────────────────────────────────────────────────
export const uploadsApi = {
  /** Upload directly using the shared signed Cloudinary transport. */
  upload: async (file: { uri: string; name?: string; mimeType?: string; base64?: string | null }) => {
    const data = await uploadFile(`${API_BASE_URL}/uploads`, "file", file.uri, file.name, file.mimeType, file.base64);
    return { data };
  },
  /** Get upload metadata by ID */
  getById: (id: string) => api.get(`/uploads/${id}`),
  /** Delete an uploaded file */
  delete: (id: string) => api.delete(`/uploads/${id}`),
};

// ─── Finance ─────────────────────────────────────────────────────────────────
export const financeApi = {
  getEligibility: () => api.get("/finance/eligibility"),
  getRiskScore: () => api.get("/finance/risk-score"),
  getLoanSchedule: (id: string) => api.get(`/finance/loans/${id}/schedule`),
  getSavingsStatus: () => api.get("/finance/savings/status"),
  depositSavings: (data: { amount: number }) =>
    api.post("/finance/savings/deposit", data),
  withdrawSavings: (data: { amount: number }) =>
    api.post("/finance/savings/withdraw", data),
  getMigrationStage: () => api.get("/finance/migration-stage"),
  getConsent: () => api.get("/finance/consent"),
  signConsent: (data: { consentType: string; version: string }) =>
    api.post("/finance/consent", data),
};

export const referralsApi = { getMine: (page = 1) => api.get("/referrals/me", { params: { page } }), checkRewards: () => api.post("/referrals/check-rewards") };

export const supportApi = {
  list: (page = 1) => api.get('/support', {params:{page,limit:20}}),
  details: (id: string) => api.get(`/support/${id}`),
  create: (data: {subject:string;description:string;category:string;rideId?:string;attachments?:Array<{url:string;name:string}>}) => api.post('/support',data),
  reply: (id: string,text: string) => api.post(`/support/${id}/messages`,{text}),
  reopen: (id: string,text: string) => api.post(`/support/${id}/reopen`,{text}),
};
