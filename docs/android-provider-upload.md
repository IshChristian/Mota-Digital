# Android provider upload repair

The screenshot reports legacy `ExponentFileSystem.readAsStringAsync` rejecting an Expo Go DocumentPicker cache file. This is a local read failure, before Cloudinary. The exact device/provider cause has not been reproduced here.

Android document selection now retains the original provider URI permission (`copyToCacheDirectory: false`). iOS keeps the picker cache copy. The shared native reader uses modern `File.base64()` directly, with modern `File.copy()` into `Paths.cache` as fallback. No legacy filesystem reader or metadata check blocks a valid content URI. Temporary fallback files are deleted after success or failure. Unknown provider size is checked against actual data; the 20 MB limit remains.

Signed direct Cloudinary upload, byte encoding and HTTPS URL validation remain unchanged. This applies to uploads that use the shared uploader, including KYC. It does not make missing/deleted files readable or override Cloudinary file restrictions.

Validation: picker/native-reader/upload regression tests and TypeScript checks. Android device, provider and live Cloudinary tests are still needed. Test a local PNG, Downloads PDF and cloud-provider document, cancellation, oversized files and retry. Verify each success produces a Cloudinary URL and persists after submitting KYC.

After merging, switch to master and run `git pull`, then restart Metro with `npx expo start --clear`. Select the document again; an old failed URI cannot be recovered by a refreshed bundle alone.
