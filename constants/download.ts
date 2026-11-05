/**
 * Where the web app sends people to install the Android app.
 * Set EXPO_PUBLIC_ANDROID_APK_URL when a new APK is published (keep it in step with the landing page's config.js).
 */
export const ANDROID_APK_URL =
  process.env.EXPO_PUBLIC_ANDROID_APK_URL ||
  "https://expo.dev/artifacts/eas/XMDmDM4KZsMxIG164EEJPyVDQUtnFhL_fUV7bDJz3DA.apk";
