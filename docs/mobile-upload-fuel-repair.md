# Mobile upload, ride and fuel changes

Merge and deploy the matching backend PR on `codex/mobile-upload-fuel-rides-20261005` before using the new fuel details/stations APIs.

## Upload configuration and rollout

Set `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` and `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET` in the build environment. The preset must be unsigned and allow the document formats your verification process accepts. Never embed the Cloudinary API secret in the mobile app. Direct uploads remain on Cloudinary.

Native files are copied into readable cache when necessary, read as base64 and POSTed as a URL-encoded data URI. This deliberately avoids JS FormData and native multipart implementations that caused the reported `Unsupported FormDataPart implementation` error. Cloudinary documents this form-encoded data URI method: https://cloudinary.com/documentation/upload_parameters#upload_via_a_base64_data_uri

The uploader is shared by profile photos, KYC and attachments. It accepts file MIME types rather than filtering everything to images, enforces the existing 20 MB cap, exposes provider errors, and returns success only after a secure URL and public ID from the configured Cloudinary cloud. Cloudinary account/preset restrictions still apply; accepting a picker file does not guarantee the provider permits it. PDF/ZIP delivery may also need the account's delivery settings enabled. For verification, upload a legible document/photo rather than unrelated files.

KYC and the earlier insurance/permit picker now use `expo-document-picker ~57.0.2`, the version bundled for Expo SDK 57. Install with `pnpm install --frozen-lockfile`; rebuild a development/native client to include the new native module. Do not deploy only an OTA JS update to an older native binary. Expo Go must match the app's SDK.

Success/failure is visible per document. A failed upload no longer remains labelled “Uploading”. Uploaded documents must still be submitted to save the KYC record for review.

## Ride UX

The passenger ride panel scrolls within the screen. Large-font action buttons stack vertically and expand rather than clipping; driver action sheets also scroll. The map control respects safe-area positioning and panel layering. Ride headings reflect pickup, travel, arrival or payment status. Driver identity and plate come from the server. Unknown location stays unavailable rather than being fabricated.

The backend fixes legacy rides missing start timestamps so destination confirmation cannot save `NaN`. Deploy both repositories.

## Fuel UX

The responsive screen uses server availability, real QR receipts, history paging and status, retry feedback, confirmed seven-day savings and configured partner stations. Account-specific query keys avoid another user's cached fuel data. Request retries reuse an idempotency key. MoMo is explicitly pending review, not a confirmed transfer. QR vouchers expire at Kigali midnight; authorized staff confirms redemption. No invented station or local voucher code is displayed. Partner payout/attendant UI integration is separate from this mobile repair.

## Checks and staging checklist

- TypeScript and Android/web Expo exports.
- Upload tests validate exact iOS/Android/web bytes with multipart construction unavailable, document MIME, URI recovery, size limits, invalid responses and errors.
- Backend regression tests validate missing ride timestamps and fuel allocation/status/authorization.

This workspace has no configured Cloudinary cloud/preset, device/emulator session or live MongoDB. A real-device staging check remains required: select JPEG and PDF, observe confirmed upload, submit KYC and retrieve the saved URL; confirm a legacy ride; request/reopen a QR voucher; have permitted staff redeem once and check savings/history. Check small screens and large accessibility fonts on-device. Automated model tests do not prove production MongoDB concurrency or a real fuel partner payout.

## Fresh welcome and Continue

Session restoration and login fetch the full safe account snapshot before routing. A failed fetch shows Retry and Sign out on the MOTA welcome loader instead of continuing from stale cached verification flags. Server state is shared through AuthContext, including actual KYC status, fee/activation flags and driver-profile existence. Verification, email completion and fee confirmation refresh the snapshot. Continue rechecks it and routes to the missing phone, document or fee step, or to home once required steps are complete. Email remains optional; drivers still pay registration fees and passengers do not.

Full KYC automatically activates pending driver accounts on the backend. An explicitly disabled/suspended account remains disabled. A native rebuild is still required for the earlier document picker addition in this PR.
