# MOTA Platform — Full API Specification

> **Version**: 2.0 — Multi-Role (Passenger + Driver + Agent + Admin)
> **Base URL**: `https://mota-be-v1-0-0-1.onrender.com/api`
> **Auth**: Bearer JWT on all protected routes
> **Updated**: August 2026

---

## Table of Contents

1. [Authentication & Onboarding](#1-authentication--onboarding)
2. [Passenger Profile Completion](#2-passenger-profile-completion)
3. [Driver Profile & Onboarding](#3-driver-profile--onboarding)
4. [Ride Lifecycle — Passenger Side](#4-ride-lifecycle--passenger-side)
5. [Ride Lifecycle — Driver Side](#5-ride-lifecycle--driver-side)
6. [Real-Time Communication (SSE)](#6-real-time-communication-sse)
7. [Wallet & Payments](#7-wallet--payments)
8. [Loans & Fines](#8-loans--fines)
9. [Algorithm Engine (Tiers & Earnings)](#9-algorithm-engine-tiers--earnings)
10. [Fuel Vouchers](#10-fuel-vouchers)
11. [P2P Transfers](#11-p2p-transfers)
12. [Notifications](#12-notifications)
13. [Admin Operations](#13-admin-operations)
14. [User Management](#14-user-management)
15. [Search & Uploads](#15-search--uploads)
16. [Finance Engine (Savings & Risk)](#16-finance-engine-savings--risk)

---

## 1. Authentication & Onboarding

The auth flow is **role-aware**. Users choose their role on the Welcome screen before registering.

### Flow Diagram

```
Welcome Screen
  ├── "Rider / Passenger" → Register(role=CLIENT)
  └── "Moto Driver"       → Register(role=DRIVER)
         ↓
      Login (shared)
         ↓
      OTP Verification
         ↓
      [Passenger]               [Driver]
        ↓                         ↓
      Complete Profile          Pay Registration
        ↓                         ↓
      → Map Screen              Complete Driver Profile
                                  ↓
                                Upload Documents
                                  ↓
                                Pending Admin Approval
                                  ↓
                                → Driver Dashboard
```

### `POST /auth/register`

Creates a new user account. The `role` field determines the onboarding path.

**Request:**
```json
{
  "firstName": "Jean",
  "lastName": "Mutoni",
  "phone": "+250788123456",
  "email": "jean@example.com",
  "password": "securePassword123",
  "nationalId": "1199880012345678",   // Required
  "role": "CLIENT",                    // "CLIENT" (passenger) or "DRIVER"
  "referralCode": "MOTA-XXXX"         // Optional
}
```

**Response (201):**
```json
{
  "user": {
    "id": "usr_abc123",
    "firstName": "Jean",
    "lastName": "Mutoni",
    "phone": "+250788123456",
    "email": "jean@example.com",
    "role": "CLIENT",
    "isVerified": false,
    "isEmailVerified": false,
    "isActive": false,
    "kycLevel": "basic",
    "registrationPaid": false,
    "registrationStatus": null
  }
}
```

> **Note:** After register, redirect to `/(auth)/confirm-phone` to verify phone via OTP.

---

### `POST /auth/login`

**Request:**
```json
{
  "identifier": "+250788123456",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbG...",
  "user": {
    "id": "usr_abc123",
    "firstName": "Jean",
    "lastName": "Mutoni",
    "phone": "+250788123456",
    "email": "jean@example.com",
    "role": "CLIENT",
    "isVerified": true,
    "isEmailVerified": true,
    "isActive": true,
    "kycLevel": "full",
    "registrationPaid": true,
    "registrationStatus": "approved",
    "tier": "bronze"
  }
}
```

**Error (403)** — Phone not verified:
```json
{
  "message": "Phone not verified",
  "phone": "+250788123456",
  "userId": "usr_abc123"
}
```
> Frontend redirects to confirm-phone screen on 403.

---

### `POST /auth/verify-otp`

**Request:**
```json
{
  "phone": "+250788123456",
  "code": "123456"
}
```

**Response (200):** Same shape as login response (token + user).

---

### `POST /auth/resend-otp`

**Request:**
```json
{
  "phone": "+250788123456",
  "userId": "usr_abc123"
}
```

---

### `POST /auth/resend-email-otp`

**Request:**
```json
{
  "email": "jean@example.com"
}
```

---

### `POST /auth/verify-email-otp`

**Request:**
```json
{
  "email": "jean@example.com",
  "otp": "654321"
}
```

---

## 2. Passenger Profile Completion

After OTP verification, **passengers** (role=CLIENT) complete a lightweight profile. No documents, no payment, no admin approval needed.

### Frontend-Only Profile Update

The passenger profile is completed by updating local user state:

```json
{
  "kycLevel": "full",
  "isActive": true,
  "emergencyContactName": "John Doe",
  "emergencyContactPhone": "0788654321",
  "preferredPayment": "CASH"
}
```

> **Backend requirement:** The backend should accept a `PUT /users/me` or `POST /passenger/complete-profile` to persist emergency contacts and payment preferences.

### `PUT /users/me` (Recommended)

**Request:**
```json
{
  "emergencyContactName": "John Doe",
  "emergencyContactPhone": "+250788654321",
  "preferredPayment": "CASH"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "usr_abc123",
    "kycLevel": "full",
    "isActive": true,
    "emergencyContactName": "John Doe",
    "emergencyContactPhone": "+250788654321",
    "preferredPayment": "CASH"
  }
}
```

> After completion, passenger is redirected to `/(passenger)` → Map screen (ride finder).

### Accepted `preferredPayment` values:
| Value  | Description |
|--------|-------------|
| `CASH` | Cash payment after ride |
| `MOMO` | MTN Mobile Money |
| `CARD` | Debit/credit card |

---

## 3. Driver Profile & Onboarding

Drivers go through a multi-step verification process.

### `POST /auth/pay-registration`

**Request:**
```json
{
  "phone": "+250788123456",
  "amount": 5000
}
```

**Response (200):**
```json
{
  "ref": "paypack_txn_ref_abc",
  "status": "pending"
}
```

### `POST /auth/registration-status`

Polls Paypack transaction status.

**Request:**
```json
{
  "ref": "paypack_txn_ref_abc"
}
```

**Response:**
```json
{
  "status": "successful"
}
```

---

### `POST /driver/create-profile`

Creates the driver profile with vehicle and document info.

**Request:**
```json
{
  "plateNumber": "RAD 123 A",
  "cooperativeName": "Kigali Moto Coop",
  "nid": "1199880012345678",
  "permitId": "DL-2024-001234",
  "insuranceAttachment": "https://res.cloudinary.com/.../insurance.jpg",
  "permitAttachment": "https://res.cloudinary.com/.../permit.jpg"
}
```

---

### `POST /auth/submit-registration`

Submits the completed profile for admin review.

**Response (200):**
```json
{
  "message": "Registration submitted for review"
}
```

---

### `GET /auth/registration-approval`

Checks current approval status. Called on polling interval (every 30s).

**Response (200):**
```json
{
  "data": {
    "status": "pending",
    "message": null,
    "rejectionReason": null
  }
}
```

| Status | Description |
|--------|-------------|
| `pending` | Awaiting admin review |
| `correction` | Admin requested changes. `rejectionReason` contains details. |
| `approved` | Account is fully active |

---

## 4. Ride Lifecycle — Passenger Side

### Map Screen State Machine

```
idle → negotiating → searching → accepted → [driver arriving] → [ride in progress]
```

### `POST /rides/request`

Passenger submits a ride request with a negotiated fare offer.

**Request:**
```json
{
  "pickup": {
    "address": "Kigali Heights",
    "lat": -1.9536,
    "lng": 30.0606
  },
  "destination": {
    "address": "Kicukiro Centre",
    "lat": -1.9773,
    "lng": 30.1025
  },
  "offeredFare": 3200,
  "backupDrivers": 3
}
```

**Response (200):**
```json
{
  "rideId": "ride_092384",
  "status": "searching"
}
```

---

### `GET /rides/my-rides?page=1`

Returns paginated ride history for the authenticated passenger.

**Response (200):**
```json
{
  "rides": [
    {
      "id": "ride_092384",
      "pickup": "Kigali Heights",
      "destination": "Kicukiro Centre",
      "fare": 3200,
      "status": "completed",
      "driverName": "Jean Pierre",
      "createdAt": "2026-08-10T22:30:00Z",
      "rating": 5
    }
  ],
  "page": 1,
  "totalPages": 3
}
```

---

### `POST /rides/:id/cancel`

Passenger cancels a pending or searching ride.

**Response (200):**
```json
{
  "success": true,
  "message": "Ride cancelled"
}
```

---

### `POST /rides/:id/rate`

Passenger rates a completed ride.

**Request:**
```json
{
  "rating": 5,
  "comment": "Very safe driver, arrived on time!"
}
```

---

## 5. Ride Lifecycle — Driver Side

### Ride State Machine (Driver)

```
[SSE: ride_request] → Accept → approaching → arrived → [PIN verify] → in_progress → completed
                    → Decline
```

### `PUT /driver/availability`

Toggle driver online/offline status.

**Request:**
```json
{
  "isOnline": true
}
```

**Response:**
```json
{
  "success": true,
  "isOnline": true
}
```

---

### `POST /rides/:id/accept`

Driver accepts an incoming ride request.

**Response (200):**
```json
{
  "success": true
}
```

---

### `POST /rides/:id/decline`

Driver declines a ride request.

---

### `GET /rides/:id`

Get full details of a ride (used by both driver and passenger).

**Response:**
```json
{
  "id": "ride_908324",
  "passengerName": "Claire U.",
  "passengerPhone": "+250788000000",
  "pickup": "Downtown Kigali",
  "destination": "Nyarutarama",
  "fare": 3500,
  "distanceKm": 6.8,
  "etaMin": 15,
  "status": "approaching",
  "pin": "8841",
  "driverName": "Jean Pierre",
  "driverPhone": "+250788111111",
  "plateNumber": "RAD 789 C",
  "createdAt": "2026-08-12T14:30:00Z"
}
```

---

### `POST /rides/:id/arrived`

Driver notifies they've arrived at the pickup point.

---

### `POST /rides/:id/start`

Driver starts the ride after verifying the passenger's PIN.

**Request:**
```json
{
  "pin": "8841"
}
```

**Response (200):**
```json
{
  "success": true,
  "status": "in_progress"
}
```

**Error (400):**
```json
{
  "message": "Invalid PIN"
}
```

---

### `POST /rides/:id/complete`

Driver marks the ride as completed.

**Response (200):**
```json
{
  "success": true,
  "status": "completed",
  "fare": 3500,
  "earnings": 3150
}
```

---

## 6. Real-Time Communication (SSE)

### `GET /realtime/driver-events` (Server-Sent Events)

Establishes a persistent SSE connection for online drivers to receive real-time ride requests.

**Headers:**
```
Authorization: Bearer <jwt_token>
Accept: text/event-stream
```

**Event: `ride_request`**
```json
{
  "id": "ride_908324",
  "passengerName": "Claire U.",
  "pickup": "Downtown Kigali",
  "destination": "Nyarutarama",
  "fare": 3500,
  "distanceKm": 6.8,
  "etaMin": 15
}
```

**Frontend implementation:**
```typescript
const es = new EventSource(url, {
  headers: { Authorization: `Bearer ${token}` }
});

es.addEventListener("ride_request", (event) => {
  const request = JSON.parse(event.data);
  showRideRequestModal(request);
});
```

> **Important:** The SSE endpoint URL is `BASE_URL` **without** `/api` suffix: `https://mota-be-v1-0-0-1.onrender.com/realtime/driver-events`

---

### Real-Time GPS Tracking & Movement

To support real-time map visual tracking, GPS movements, and available motor density representation, the backend exposes the following endpoints:

#### 1. `POST /realtime/location`

Pushes current coordinates. Drivers only send when their status is online. Passengers send during an active/pending ride.

**Request:**
```json
{
  "lat": -1.95360,
  "lng": 30.06060,
  "bearing": 180.5,
  "speed": 12.4
}
```

**Response (200):**
```json
{
  "success": true
}
```

#### 2. `GET /realtime/nearby-drivers`

Retrieves currently online drivers with status `available` within target vicinity.

**Request Parameters:**
- `lat` (query, required)
- `lng` (query, required)
- `radius` (query, optional, default: 2000)

**Response (200):**
```json
{
  "drivers": [
    {
      "driverId": "usr_drv9812",
      "name": "Jean",
      "plateNumber": "RAD 111 A",
      "lat": -1.9545,
      "lng": 30.0590,
      "bearing": 90.0,
      "status": "available"
    },
    {
      "driverId": "usr_drv4432",
      "name": "Eric",
      "plateNumber": "RAD 222 B",
      "lat": -1.9520,
      "lng": 30.0620,
      "bearing": 215.3,
      "status": "available"
    }
  ]
}
```

#### 3. `GET /realtime/ride-tracking/:rideId` (SSE)

Real-time location stream for an active ride. Both parties subscribe.

**Event: `location_update`**
```json
{
  "rideId": "ride_908324",
  "role": "DRIVER",
  "lat": -1.9508,
  "lng": 30.0632,
  "bearing": 120.4,
  "etaMin": 8
}
```

---

## 7. Wallet & Payments

### `GET /wallet/balance`

**Response:**
```json
{
  "balance": 45000,
  "currency": "RWF"
}
```

### `GET /wallet/transactions?page=1`

**Response:**
```json
{
  "transactions": [
    {
      "id": "txn_001",
      "type": "credit",
      "amount": 3500,
      "description": "Ride earnings",
      "createdAt": "2026-08-12T14:30:00Z"
    }
  ]
}
```

### `POST /wallet/cash-in`

**Request:**
```json
{
  "amount": 5000,
  "phone": "+250788123456"
}
```

### `POST /wallet/cash-out`

**Request:**
```json
{
  "amount": 10000
}
```

---

### `POST /payment/request` (Paypack — Ride Payment)

Triggers a MoMo push payment to the passenger.

**Request:**
```json
{
  "passengerPhone": "+250788000000",
  "amount": 3500,
  "rideId": "ride_908324"
}
```

### `GET /payment/status/:ref`

Polls the status of a Paypack transaction.

---

## 8. Loans & Fines

### `POST /loans/request`

Driver applies for a traffic fine loan.

**Request:**
```json
{
  "tinNumber": "100987654",
  "ticketNumber": "RNP-2026-9908"
}
```

**Response:**
```json
{
  "loanId": "loan_3874",
  "status": "under_review",
  "amount": 25000,
  "tinNumber": "100987654",
  "ticketNumber": "RNP-2026-9908"
}
```

### `GET /loans/my-loans`

**Response:**
```json
{
  "loans": [
    {
      "id": "loan_3874",
      "tinNumber": "100987654",
      "ticketNumber": "RNP-2026-9908",
      "amount": 25000,
      "status": "approved",
      "createdAt": "2026-08-09T10:00:00Z"
    }
  ]
}
```

| Loan Status | Description |
|-------------|-------------|
| `pending` | Just submitted |
| `under_review` | Being processed |
| `approved` | Loan disbursed |
| `rejected` | Loan denied |

### `POST /loans/repay`

**Request:**
```json
{
  "loanId": "loan_3874",
  "amount": 5000
}
```

---

### `POST /fine-requests`

Submit a fine dispute/request for admin review.

**Request:**
```json
{
  "fineId": "fine_001",
  "amount": 15000,
  "reason": "Incorrect ticket — was not in violation",
  "attachments": [
    { "url": "https://res.cloudinary.com/.../proof.jpg", "description": "Photo evidence" }
  ]
}
```

### `GET /fine-requests/my?page=1&limit=20`

Driver's own fine requests.

### `GET /fine-requests/all?status=pending&page=1` (Admin)

All fine requests for admin review.

---

## 9. Algorithm Engine (Tiers & Earnings)

### `GET /rider/status`

**Response:**
```json
{
  "data": {
    "current_tier": "silver",
    "daily_rides": 8,
    "monthly_rides": 142,
    "streak_days": 12,
    "daily_earnings": 28000,
    "cycle_number": 3,
    "trophies": ["Early Bird", "100 Rides"],
    "features_unlocked": ["fuel_vouchers", "priority_rides"],
    "fines": []
  }
}
```

### `GET /rider/earnings`

**Response:**
```json
{
  "data": {
    "base_pay": 500,
    "tier_multiplier": 1.15,
    "daily_estimated": 28000,
    "monthly_estimated": 560000,
    "today_total": 18500
  }
}
```

### `GET /rider/status/:id` (Admin)

Get algorithm status for a specific driver.

### `GET /rider/earnings/:id` (Admin)

Get earnings for a specific driver.

---

## 10. Fuel Vouchers

### `POST /fuel-vouchers/claim-momo`

Claims a 1,000 RWF MoMo fuel voucher.

**Response:**
```json
{
  "success": true,
  "message": "1,000 RWF sent to your MTN MoMo"
}
```

### `POST /fuel-vouchers/claim-qr`

Generates a QR code voucher for Rubis stations.

**Response:**
```json
{
  "voucherId": "voucher_001",
  "qrCode": "data:image/png;base64,...",
  "expiresAt": "2026-08-12T23:59:00Z",
  "amount": 1000
}
```

### `GET /fuel-vouchers/daily-status`

```json
{
  "used": 1,
  "limit": 3,
  "remaining": 2,
  "totalSaved": 2000
}
```

### `GET /fuel-vouchers/history?page=1&limit=20`

### `GET /fuel-vouchers/weekly-savings`

### `GET /fuel-vouchers/stations?lat=-1.95&lng=30.06&filter=rubis`

### `PATCH /fuel-vouchers/:voucherId/redeem`

---

## 11. P2P Transfers

### `POST /transfer/send`

**Request:**
```json
{
  "phone": "+250788654321",
  "amount": 2000,
  "description": "Lunch money"
}
```

### `POST /transfer/send-qr`

Same payload, initiated from QR scan.

### `GET /transfer/qr-code?amount=5000`

Generate a receive QR code.

### `GET /transfer/history?page=1&limit=20`

---

## 12. Notifications

### `GET /notifications?page=1`

**Response:**
```json
{
  "notifications": [
    {
      "id": "notif_001",
      "title": "Ride Completed",
      "message": "You earned 3,500 RWF",
      "read": false,
      "createdAt": "2026-08-12T14:30:00Z"
    }
  ]
}
```

### `GET /notifications/unread?page=1`

### `PATCH /notifications/:id/read`

### `DELETE /notifications/:id`

---

## 13. Admin Operations

### `GET /admin/registrations?status=pending&page=1&limit=20`

Lists all driver registration applications.

**Response:**
```json
{
  "requests": [
    {
      "userId": "usr_982347",
      "fullName": "Jean Rene",
      "plateNumber": "RAD 123 A",
      "licenseNumber": "12345/67890",
      "registrationStatus": "pending"
    }
  ]
}
```

### `GET /admin/registrations/:userId`

Get detailed registration for a specific user.

### `PUT /admin/registrations/:userId/status`

**Request:**
```json
{
  "status": "approved",
  "rejectionReason": null
}
```

| Status | Effect |
|--------|--------|
| `approved` | Driver account becomes active |
| `correction` | Driver is notified to fix profile issues |
| `pending` | Reset to pending (re-review) |

---

## 14. User Management

### `GET /users/me`

Returns the authenticated user's full profile.

### `PUT /users/me`

**Request:**
```json
{
  "firstName": "Jean",
  "lastName": "Mutoni",
  "email": "new-email@example.com"
}
```

### `POST /users/avatar`

Upload profile photo.

**Headers:** `Content-Type: multipart/form-data`
**Body:** `avatar` (image file)

**Response:**
```json
{
  "profileImage": "https://storage.mota.rw/avatars/usr_abc123.jpg"
}
```

---

## 15. Search & Uploads

### `GET /search?q=jean`

Universal search across drivers, rides, transactions.

### `GET /search/users?q=0788`

Search specifically for users.

### `POST /uploads`

**Headers:** `Content-Type: multipart/form-data`

### `GET /uploads/:id`

### `DELETE /uploads/:id`

---

## 16. Finance Engine (Savings & Risk)

### `GET /finance/eligibility`

Check if user is eligible for financial products.

### `GET /finance/risk-score`

Get user's calculated risk score for loan eligibility.

### `GET /finance/loans/:id/schedule`

Get repayment schedule for a specific loan.

### `GET /finance/savings/status`

```json
{
  "balance": 125000,
  "interestRate": 0.05,
  "lastDeposit": "2026-08-10T10:00:00Z",
  "migrationStage": "saver"
}
```

### `POST /finance/savings/deposit`

**Request:** `{ "amount": 5000 }`

### `POST /finance/savings/withdraw`

**Request:** `{ "amount": 3000 }`

### `GET /finance/migration-stage`

Returns user's financial journey stage (loan-dependent → saver → investor).

### `GET /finance/consent`

### `POST /finance/consent`

**Request:**
```json
{
  "consentType": "data_sharing",
  "version": "1.0"
}
```

---

## User Schema Reference

```typescript
type User = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: "DRIVER" | "CLIENT" | "AGENT" | "ADMIN";
  tier?: string;                    // bronze, silver, gold, platinum, gorilla
  isVerified?: boolean;             // Phone verified
  isEmailVerified?: boolean;        // Email verified
  isActive?: boolean;               // Fully onboarded
  twoFactorEnabled?: boolean;
  kycLevel?: "basic" | "full";
  registrationPaid?: boolean;       // Driver-only
  registrationStatus?: "pending" | "correction" | "approved";  // Driver-only
  profileImage?: string;
  emergencyContactName?: string;    // Passenger-only
  emergencyContactPhone?: string;   // Passenger-only
  preferredPayment?: "CASH" | "MOMO" | "CARD";  // Passenger-only
};
```

---

## Onboarding Gates Summary

| Gate | Applies To | Condition to Pass |
|------|-----------|-------------------|
| Phone Verification | All | `isVerified === true` |
| Email Verification | All (with email) | `isEmailVerified === true` |
| Registration Payment | Driver only | `registrationPaid === true` |
| Profile Completion | All | `kycLevel === "full"` |
| Admin Approval | Driver only | `registrationStatus === "approved"` |

> **Passengers skip** registration payment, document upload, and admin approval. After completing their basic profile, they are immediately directed to the map screen.

---

## Error Format

All API errors follow this shape:

```json
{
  "message": "Human readable error description",
  "error": "ERROR_CODE",
  "statusCode": 400
}
```

| Status | Meaning |
|--------|---------|
| 400 | Validation error |
| 401 | Token expired / invalid → auto-logout |
| 403 | Phone not verified (redirect to OTP) |
| 404 | Resource not found |
| 409 | Conflict (e.g., duplicate phone) |
| 500 | Server error |
