import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import { fetch as expoFetch } from 'expo/fetch';
import { getStoredToken } from './secureStorage';

const maxSize = 20 * 1024 * 1024;
const types: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', gif: 'image/gif', bmp: 'image/bmp', tif: 'image/tiff', tiff: 'image/tiff', pdf: 'application/pdf' };
// Avoid Blob/FormData and btoa assumptions across Expo and browser implementations.
function encodeBase64(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const chunks: string[] = [];
  let part = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    part += alphabet[a >> 2] + alphabet[((a & 3) << 4) | ((b || 0) >> 4)] + (i + 1 < bytes.length ? alphabet[((b & 15) << 2) | ((c || 0) >> 6)] : '=') + (i + 2 < bytes.length ? alphabet[c & 63] : '=');
    if (part.length >= 16384) { chunks.push(part); part = ''; }
  }
  chunks.push(part);
  return chunks.join('');
}
/** All upload requests are JSON strings. No platform sends FormData parts. */
export async function uploadFile(url: string, field: string, uri: string, selectedName?: string, selectedMimeType?: string, selectedBase64?: string | null): Promise<any> {
  const token = await getStoredToken();
  if (!token) throw new Error('Sign in again before uploading this file.');
  let filename = (selectedName || uri.split(/[?#]/)[0].split('/').pop() || 'upload.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
  let mimeType = selectedMimeType || types[filename.split('.').pop()?.toLowerCase() || ''] || 'application/octet-stream';
  let base64 = selectedBase64 || '';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    if (base64) {
      // Expo ImagePicker returns JPEG base64, independently of the source extension.
      filename = filename.replace(/\.[^.]+$/, '') + '.jpg'; mimeType = 'image/jpeg';
    } else if (Platform.OS === 'web') {
      const source = await fetch(uri, { signal: controller.signal });
      if (!source.ok) throw new Error('Could not read the selected file. Select it again.');
      const bytes = new Uint8Array(await source.arrayBuffer());
      if (bytes.length > maxSize) throw new Error('Choose a file smaller than 20 MB.');
      base64 = encodeBase64(bytes);
    } else {
      try { base64 = await new File(uri).base64(); }
      catch {
        try { base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 }); }
        catch { throw new Error('Could not read the selected file. Select it again and allow photo access.'); }
      }
    }
    if (!base64) throw new Error('This file is empty. Choose another file.');
    const size = Math.floor(base64.length * 3 / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
    if (size > maxSize) throw new Error('Choose a file smaller than 20 MB.');
    const response = await (Platform.OS === 'web' ? fetch : expoFetch)(url, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ fieldName: field, fileName: filename, mimeType, fileBase64: base64 }), signal: controller.signal,
    });
    const text = await response.text();
    let payload: any;
    try { payload = JSON.parse(text); } catch { payload = null; }
    if (!response.ok) {
      if (response.status === 401) throw new Error('Your session has expired. Sign in again before uploading.');
      if (response.status === 413) throw new Error('Choose a file smaller than 20 MB.');
      throw new Error(payload?.message || `Upload failed (${response.status}). Please retry.`);
    }
    if (!payload) throw new Error('The upload server returned an invalid response. Please retry.');
    return payload;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('The upload timed out. Check your connection and retry.');
    throw error;
  } finally { clearTimeout(timer); }
}
