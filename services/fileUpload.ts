import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';
import { getStoredToken } from './secureStorage';
import { encodeFileMultipart } from '../utils/multipart';

const types: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', gif: 'image/gif', bmp: 'image/bmp', tif: 'image/tiff', tiff: 'image/tiff', pdf: 'application/pdf' };
/** Send file bytes with explicit multipart metadata on both native and web. */
export async function uploadFile(url: string, field: string, uri: string, selectedName?: string, selectedMimeType?: string): Promise<any> {
  const token = await getStoredToken();
  if (!token) throw new Error('Sign in again before uploading this file.');
  const filename = selectedName || uri.split(/[?#]/)[0].split('/').pop() || 'upload.jpg';
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const mimeType = selectedMimeType || types[extension] || 'application/octet-stream';
  let bytes: Uint8Array;
  try {
    if (Platform.OS === 'web') {
      const source = await fetch(uri);
      if (!source.ok) throw new Error('Unable to read selected file');
      bytes = new Uint8Array(await source.arrayBuffer());
    } else bytes = await new File(uri).bytes();
  } catch {
    throw new Error('Could not read the selected file. Select it again and allow photo access.');
  }
  if (!bytes.length) throw new Error('This file is empty. Choose another file.');
  if (bytes.length > 20 * 1024 * 1024) throw new Error('Choose a file smaller than 20 MB.');
  const boundary = `MotaUpload${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  const { body, contentType } = encodeFileMultipart(field, filename, mimeType, bytes, boundary);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await (Platform.OS === 'web' ? fetch : expoFetch)(url, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': contentType },
      body, signal: controller.signal,
    });
    const text = await response.text();
    let payload: any;
    try { payload = JSON.parse(text); } catch { payload = null; }
    if (!response.ok) {
      if (response.status === 401) throw new Error('Your session has expired. Sign in again before uploading.');
      if (response.status === 413) throw new Error('This file is too large. Choose a smaller file.');
      throw new Error(payload?.message || payload?.error || `Upload failed (${response.status}). Please retry.`);
    }
    if (!payload) throw new Error('The upload server returned an invalid response. Please retry.');
    return payload;
  } catch (error: any) {
    if (controller.signal.aborted) throw new Error('The upload timed out. Check your connection and retry.');
    throw error;
  } finally { clearTimeout(timeout); }
}
