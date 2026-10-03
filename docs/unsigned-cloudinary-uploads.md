# Unsigned direct Cloudinary uploads

Set these public build variables in the mobile app's environment:

```dotenv
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset_name
```

Create the preset in Cloudinary Settings > Upload > Upload presets and set its signing mode to Unsigned. Configure its asset folder as mota_uploads, disable client-supplied public IDs, and allow the image/document formats needed by MOTA. The client checks a 20 MB maximum. Do not put a Cloudinary API secret in EXPO_PUBLIC variables. The unsigned preset is visible to app users; configure its format restrictions in Cloudinary.

Restart Expo with `npx expo start --clear` after changing the environment. Rebuild release apps so these values are included in the bundle.

Android/iOS use native multipart upload directly to Cloudinary with upload_preset as a form parameter. Web sends a base64 data URI in a URL-encoded request. Neither path constructs React Native FormData. Successful uploads require public_id and secure_url. Existing screens retain their upload success/failure feedback.

KYC documents save the returned URL through the existing KYC flow. Profile images upload to Cloudinary first, then save avatarUrl using PUT /users/me. Deploy the companion backend change that allows a Cloudinary image URL from the configured cloud. If saving the profile fails, the uploaded asset can remain in Cloudinary; the app reports the failure.

Live verification: test a photo, document, failed preset, and profile save on a physical phone with the deployed backend. Automated tests mock native/Cloudinary operations and do not establish live upload success.
