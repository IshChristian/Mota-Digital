# MOTA Mobile Environment Variables

Create a `.env` file in the repository root, next to `package.json`. Expo automatically loads variables prefixed with `EXPO_PUBLIC_`.

```dotenv
# Required: production backend API, including the /api prefix
EXPO_PUBLIC_API_BASE_URL=https://mota-be-v1-0-0-1.onrender.com/api

# Required for Google Maps and Google route rendering
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=replace_with_google_maps_api_key

# Optional: OpenStreetMap route server used by Server 1
EXPO_PUBLIC_OSRM_URL=https://router.project-osrm.org

# Required in production for the Help & Support call action
EXPO_PUBLIC_SUPPORT_PHONE=+250XXXXXXXXX

# Optional: defaults to support@mota.rw when omitted
EXPO_PUBLIC_SUPPORT_EMAIL=support@mota.rw

# Required before public release: exact registered entity shown in legal documents
EXPO_PUBLIC_LEGAL_COMPANY_NAME=Your Registered Company Name Ltd

# Required before public release: registered business address
EXPO_PUBLIC_LEGAL_ADDRESS=Street, City, Country

# Required before public release: monitored privacy and data-rights inbox
EXPO_PUBLIC_PRIVACY_EMAIL=privacy@example.com
```

## Variable reference

| Variable | Required | Used for | Default |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | Yes | Authentication, rides, wallet, KYC, notifications, and all backend requests | Render production API |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Yes | Native Google Maps and Google route display | None |
| `EXPO_PUBLIC_OSRM_URL` | No | OpenStreetMap/OSRM route calculations | Public OSRM server |
| `EXPO_PUBLIC_SUPPORT_PHONE` | Production | Call-support action | None; calling is disabled |
| `EXPO_PUBLIC_SUPPORT_EMAIL` | No | Email-support action | `support@mota.rw` |
| `EXPO_PUBLIC_LEGAL_COMPANY_NAME` | Production | Data-controller and contracting entity displayed in legal documents | `MOTA operating company` |
| `EXPO_PUBLIC_LEGAL_ADDRESS` | Production | Registered address displayed in legal documents | Support referral text |
| `EXPO_PUBLIC_PRIVACY_EMAIL` | Production | Privacy and data-rights requests | Support email |

## Google Maps configuration

The Google key must support the platforms you release. Configure separate restricted keys when possible:

- Android: restrict by package name `com.tiangroupinnovation.mota` and signing-certificate fingerprint.
- iOS: restrict by bundle identifier `com.tiangroupinnovation.mota`.
- Web: restrict by the deployed website origins.
- Enable the Maps SDKs and route service required by the application.

Do not use an unrestricted Google Maps key in production.

## Security notes

- Every `EXPO_PUBLIC_` value is embedded in the client application and can be inspected by users. Never put database credentials, JWT secrets, payment-provider secrets, private signing keys, or backend service credentials in this file.
- Keep `.env` local. It is ignored by Git and must not be committed.
- Configure production values with EAS environment variables or secrets for release builds.
- Restart Expo with `pnpm start:clear` after changing the file.

## Verify the configuration

```bash
pnpm install
pnpm exec expo config --type public
pnpm typecheck
pnpm start:clear
```

The public Expo-config command displays public client configuration. Do not paste its output into public issues if it contains keys you do not intend to share.
