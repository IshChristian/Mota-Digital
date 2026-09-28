import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { API_BASE_URL } from './api';
import { getStoredToken } from './secureStorage';

/** Upload through the authenticated backend; Cloudinary credentials stay server-side. */
export async function uploadToCloudinary(uri: string, _folder?: string, selectedName?: string, selectedMimeType?: string): Promise<string> {
  const filename = selectedName || uri.split('/').pop() || 'upload.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const source = await fetch(uri);
    if (!source.ok) throw new Error('Unable to read selected file');
    formData.append('file', await source.blob(), filename);
  } else {
    // Expo's fetch rejects React Native's { uri, name, type } FormData parts.
    // File exposes bytes(), which its multipart encoder accepts.
    const file = new File(uri);
    if (!file.exists) throw new Error('The selected file is no longer available. Choose it again.');
    formData.append('file', file as Blob, filename);
  }

  const token = await getStoredToken();
  if (!token) throw new Error('Authentication required');
  const response = await (Platform.OS === 'web' ? fetch : expoFetch)(`${API_BASE_URL}/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    body: formData,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) throw new Error('Your session has expired. Sign in again before uploading.');
    throw new Error(payload?.message || (response.status === 413 ? 'This file is too large. Choose a smaller image.' : `Upload failed (${response.status}). Please retry.`));
  }
  const url = payload?.data?.url || payload?.data?.secureUrl || payload?.url || payload?.secureUrl;
  if (typeof url !== 'string' || !/^https:\/\//i.test(url)) throw new Error('The upload response did not contain a secure file link. Please retry.');
  return url;
}
