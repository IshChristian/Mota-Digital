# Android upload file reading

The previous uploader relied on legacy readAsStringAsync; Android could reject it with a Java IOException while opening an otherwise selected file. This failure occurs before Cloudinary authorization/upload.

Use the supported Expo File.base64 API first. Provider/content URIs are copied into app cache before reading, raw absolute paths are normalized to file URIs, and a failed read of a file URI retries from a fresh app-owned copy. The legacy reader is retained only as the final compatibility fallback. Size and existence checks remain; temporary files are cleaned on success or failure. When both readers fail, report an actionable downloaded-copy/new-photo instruction without exposing the raw Java exception or filesystem path.

Signed Cloudinary transport, all-format document selection and confirmed HTTPS URL return remain unchanged. No dependency upgrade or new native module is introduced. Run pnpm install and restart Expo with --clear after checkout. Physically inaccessible, deleted or permission-revoked source files must be downloaded/reselected; the app cannot reconstruct their bytes.

Tests cover modern reading when legacy reading fails, app-owned copy recovery, content URIs, absolute paths, compatibility fallback, both readers failing, copy failure, missing files and oversize files. Real Android/provider testing remains required.
