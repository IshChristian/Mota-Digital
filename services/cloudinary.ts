import { Platform } from 'react-native';
import { API_BASE_URL } from './api';
import { getStoredToken } from './secureStorage';

/** Upload through the authenticated backend; Cloudinary credentials stay server-side. */
export async function uploadToCloudinary(uri: string, _folder?: string): Promise<string> {
  const filename = uri.split('/').pop() || 'upload.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType = ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const source = await fetch(uri);
    if (!source.ok) throw new Error('Unable to read selected file');
    formData.append('file', await source.blob(), filename);
  } else {
    formData.append('file', {
      uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
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
  if (!response.ok) throw new Error(`Upload failed (${response.status})`);
  const payload = await response.json();
  const url = payload?.data?.url || payload?.data?.secureUrl || payload?.url || payload?.secureUrl;
  if (!url) throw new Error('Upload completed without a file URL');
  return url;
}
