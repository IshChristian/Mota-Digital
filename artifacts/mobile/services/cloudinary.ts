import { Platform } from 'react-native';

const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dfxxwj8zx';
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'mota_unsigned';

export async function uploadToCloudinary(
  uri: string,
  folder: string = 'mota-docs'
): Promise<string> {
  const formData = new FormData();

  const filename = uri.split('/').pop() || 'upload.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType = ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  // React Native requires the file object in this specific format
  if (Platform.OS === 'web') {
    // On web, fetch the blob and append it
    const response = await fetch(uri);
    const blob = await response.blob();
    formData.append('file', blob, filename);
  } else {
    // On native, use the URI-based object
    formData.append('file', {
      uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
      name: filename,
      type: mimeType,
    } as any);
  }

  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

  console.log('[Cloudinary] Uploading to:', uploadUrl);
  console.log('[Cloudinary] Preset:', UPLOAD_PRESET, '| Folder:', folder);

  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      // Do NOT set Content-Type — let fetch set it with the boundary for multipart
    });

    const responseText = await response.text();
    console.log('[Cloudinary] Response status:', response.status);

    if (!response.ok) {
      console.error('[Cloudinary] Upload error:', responseText);
      // Parse error for more helpful message
      try {
        const errorData = JSON.parse(responseText);
        const errorMsg = errorData?.error?.message || responseText;
        throw new Error(`Upload failed: ${errorMsg}`);
      } catch (parseErr) {
        throw new Error(`Upload failed (${response.status}): ${responseText}`);
      }
    }

    const data = JSON.parse(responseText);
    if (!data.secure_url) {
      console.error('[Cloudinary] No secure_url in response:', data);
      throw new Error('No URL returned from Cloudinary');
    }

    console.log('[Cloudinary] Upload success:', data.secure_url);
    return data.secure_url;
  } catch (err: any) {
    console.error('[Cloudinary] Upload exception:', err.message);
    throw err;
  }
}
