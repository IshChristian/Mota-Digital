# MOTA Ride-Hailing Platform - Backend API Integration Specification

This document details all required API endpoints, Request/Response payloads, database model updates, and Server-Sent Events (SSE) specifications introduced for the passenger and driver workflow synchronization.

---

## 1. Ride Schema Database Updates (`Ride` Model)

Ensure your database schema includes the following new and updated fields:

| Field Name | Type | Description | Required |
|---|---|---|---|
| `passengers` | `Number` | Number of passengers requesting the ride | No (Default: 1) |
| `scheduledDate` | `String` | Scheduled ride date (e.g. `"2026-09-02"`) | No |
| `scheduledTime` | `String` | Scheduled ride time (e.g. `"02:30 PM"`) | No |
| `pickup` | `Object` | Pickup location details (`name`, `lat`, `lng`) | Yes |
| `destination` | `Object` | Destination details (`name`, `lat`, `lng`) | Yes |
| `offeredFare` | `Number` | Negotiated fare amount in RWF | Yes |
| `status` | `String` | State (`searching`, `accepted`, `approaching`, `arrived`, `in_progress`, `completed`, `cancelled`) | Yes |

---

## 2. API Endpoints Specification

### A. Request a Ride (`POST /api/rides/request`)

**Passenger sends a ride request:**

- **URL**: `/api/rides/request`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <passenger_token>`
- **Request Body**:
```json
{
  "pickup": {
    "name": "Kigali City Center, Rwanda",
    "lat": -1.9536,
    "lng": 30.0606
  },
  "destination": {
    "name": "Remera, Kigali, Rwanda",
    "lat": -1.9773,
    "lng": 30.1025
  },
  "offeredFare": 1500,
  "backupDrivers": 3,
  "passengers": 2,
  "scheduledDate": "2026-09-02",
  "scheduledTime": "02:30 PM"
}
```

- **Success Response (201 Created)**:
```json
{
  "status": "success",
  "message": "Ride request broadcasted to nearby drivers",
  "data": {
    "rideId": "66d628ab9102c4819e001122"
  }
}
```

---

### B. Driver Real-Time Ride Event (SSE Payload)

- **Event Name**: `ride_request`
- **Channel**: `/realtime/driver-events` (Server-Sent Events)
- **SSE Data Format**:
```json
{
  "id": "66d628ab9102c4819e001122",
  "pickup": {
    "address": "Kigali City Center, Rwanda",
    "distanceKm": 0.5
  },
  "destination": {
    "address": "Remera, Kigali, Rwanda",
    "distanceKm": 3.2
  },
  "offeredFare": 1500,
  "passengers": 2,
  "scheduledDate": "2026-09-02",
  "scheduledTime": "02:30 PM",
  "expiresInSeconds": 30
}
```

---

### C. Driver Real-time GPS Location Update (`PUT /api/driver/location`)

**Driver mobile app continuously updates current GPS coordinates:**

- **URL**: `/api/driver/location`
- **Method**: `PUT`
- **Headers**: `Authorization: Bearer <driver_token>`
- **Request Body**:
```json
{
  "latitude": -1.953621,
  "longitude": 30.060612
}
```

- **Success Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Driver location updated"
}
```

---

### D. Get Ride Details (`GET /api/rides/:id`)

**Passenger & Driver query current status and updated locations:**

- **URL**: `/api/rides/:id`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`
- **Success Response (200 OK)**:
```json
{
  "status": "success",
  "data": {
    "ride": {
      "_id": "66d628ab9102c4819e001122",
      "status": "approaching",
      "offeredFare": 1500,
      "passengers": 2,
      "scheduledDate": "2026-09-02",
      "scheduledTime": "02:30 PM",
      "pickup": {
        "name": "Kigali City Center",
        "lat": -1.9536,
        "lng": 30.0606
      },
      "destination": {
        "name": "Remera, Kigali",
        "lat": -1.9773,
        "lng": 30.1025
      },
      "driver": {
        "_id": "driver_9988",
        "firstName": "Jean Paul",
        "phone": "+250788112233",
        "plate": "RAA 123 A",
        "lastLocation": {
          "latitude": -1.9512,
          "longitude": 30.0620
        }
      },
      "passenger": {
        "_id": "passenger_4455",
        "firstName": "Marie",
        "phone": "+250788654321"
      }
    }
  }
}
```

---

### E. Mobile Payment Processing (`POST /api/payment/request`)

**Passenger initiates Momo / Airtel payment:**

- **URL**: `/api/payment/request`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
```json
{
  "passengerPhone": "+250788654321",
  "amount": 1500,
  "rideId": "66d628ab9102c4819e001122"
}
```

- **Success Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Payment prompt sent to passenger phone",
  "data": {
    "transactionRef": "PAYPACK_TX_98765"
  }
}
```
