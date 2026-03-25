# MOTA Driver App Workspace

## Overview

pnpm workspace monorepo with TypeScript. Contains the MOTA Driver App (Expo React Native) and an Express API server.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm

## Structure

```text
artifacts/
├── mobile/           # Expo React Native app (MOTA Driver App)
├── api-server/       # Express API server (local proxy/helpers)
└── mockup-sandbox/   # Vite component preview server
lib/
├── api-client-react/ # Generated React Query hooks
├── api-spec/         # OpenAPI spec + Orval config
├── api-zod/          # Generated Zod schemas
└── db/               # Drizzle ORM schema + DB connection
```

## MOTA Driver App (`artifacts/mobile`)

### Overview
Production mobile app for moto-taxi drivers in Kigali, Rwanda. Connects to external backend API at `https://mota-be-v1-0-0-1.onrender.com/api`.

### Key Features
- Auth screens: login, register, OTP, email verify, document upload, driver profile creation, registration payment
- Main tabs: dashboard, rides, wallet, profile
- Modal screens: MOTA card (QR), log ride, loans, leaderboard, notifications
- Profile sub-screens: personal info, vehicle info, documents & permits
- Wallet: cash-in via Paypack MoMo, cash-out withdrawal requests
- Theme: dark/light mode toggle (dark=MOTA branded, light=black&white)
- Logo: MOTA brand logo used on all auth screens
- i18n: English/Kinyarwanda/French
- Cloudinary document upload for insurance, permit, permit ID photos

### Registration Flow
1. Register → OTP verification
2. If email provided → email verification notice screen
3. Upload documents (Cloudinary): insurance, permit, permit ID
4. Create driver profile (plate number, cooperative, NID)
5. Pay registration fee (5,000 RWF via MoMo)
6. Dashboard

### Login Flow
After login checks: `isVerified` → `isEmailVerified` → `kycLevel === "full"` → payment status. Redirects to appropriate completion screen if needed.

### Environment Variables (`.env`)
```
EXPO_PUBLIC_API_BASE_URL=https://mota-be-v1-0-0-1.onrender.com/api
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=dfxxwj8zx
EXPO_PUBLIC_CLOUDINARY_API_KEY=784593137791129
```

### Key Files
- `app/_layout.tsx` — root layout with ThemeProvider, auth guard
- `app/(auth)/` — login, register, otp, verify-email, upload-documents, create-profile, payment-registration
- `app/(tabs)/` — dashboard, rides, wallet, profile
- `app/profile/` — personal-info, vehicle-info, documents
- `context/AuthContext.tsx` — JWT auth, AsyncStorage on web, SecureStore on native
- `context/ThemeContext.tsx` — dark/light theme with AsyncStorage persistence
- `context/I18nContext.tsx` — multilingual support
- `services/api.ts` — Axios client with auth interceptor
- `services/cloudinary.ts` — Cloudinary direct upload helper
- `assets/images/` — logo-light.png, logo-dark.png, logo-on-dark.png, logo-on-light.png

### Theme Colors
- **Dark mode**: bg #0A0E1A, cards #111827, text white, primary #E63946 (MOTA red)
- **Light mode**: bg #F8F9FA, cards white, text #0A0A0A, primary #E63946 (MOTA red)

### Tier Colors
bronze #CD7F32, silver #C0C0C0, gold #FFD700, platinum #E5E4E2, gorilla #4ECDC4

### Notes
- Do NOT use uuid — use `Date.now().toString() + Math.random().toString(36)` for IDs
- expo-secure-store not available on web — use AsyncStorage fallback via Platform.OS check
- JWT stored in expo-secure-store (native) / AsyncStorage (web) under key `auth_token`
- User data cached in AsyncStorage under `user_data`
- Language preference stored in AsyncStorage under `app_language`
- Theme preference stored in AsyncStorage under `app_theme`
- Cloudinary unsigned upload preset: `mota_unsigned`
