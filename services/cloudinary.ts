import { Platform } from 'react-native';
import { API_BASE_URL } from './api';
import { getStoredToken } from './secureStorage';

/** Upload through the authenticated backend; Cloudinary credentials stay server-side. */
export async function uploadToCloudinary(uri: string, _folder?: string, selectedName?: string, selectedMimeType?: string): Promise<string> {
  const filename = selectedName || uri.split('/').pop() || 'upload.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType = selectedMimeType || (ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`);
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const source = await fetch(uri);
    if (!source.ok) throw new Error('Unable to read selected file');
    formData.append('file', await source.blob(), filename);
  } else {
    formData.append('file', {
      uri,
      name: filename,
      type: mimeType,
    } as any);
  }

  const token = await getStoredToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${API_BASE_URL}/uploads`, {
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
