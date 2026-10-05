import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

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
// Native multipart is assembled by Expo's native uploader, never JS FormData.
async function uploadNative(url: string, field: string, uri: string, filename: string, mimeType: string, preset: string, pickerBase64?: string | null): Promise<any> {
  let temporary: string | undefined;
  let fileUri = uri;
  let task: ReturnType<typeof FileSystem.createUploadTask> | undefined;
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    // Native uploads need a local file. Keep readable picker files in place.
    let info: FileSystem.FileInfo | undefined;
    if (uri.startsWith('file://')) {
      try { info = await FileSystem.getInfoAsync(uri); } catch { /* recover below */ }
    }
    if (!info?.exists) {
      if (!FileSystem.cacheDirectory) throw new Error('Upload storage is unavailable. Restart the app.');
      temporary = `${FileSystem.cacheDirectory}upload-${Date.now()}-${Math.random().toString(36).slice(2)}-${filename}`;
      if (pickerBase64) {
        const size = Math.floor(pickerBase64.length * 3 / 4) - (pickerBase64.endsWith('==') ? 2 : pickerBase64.endsWith('=') ? 1 : 0);
        if (size > maxSize) throw new Error('Choose a file smaller than 20 MB.');
        // Picker base64 is JPEG; restore a native file only when its URI is inaccessible.
        filename = filename.replace(/\.[^.]+$/, '') + '.jpg'; mimeType = 'image/jpeg';
        temporary += '.jpg';
        await FileSystem.writeAsStringAsync(temporary, pickerBase64, { encoding: FileSystem.EncodingType.Base64 });
      } else {
        try { await FileSystem.copyAsync({ from: uri, to: temporary }); }
        catch { throw new Error('Could not read the selected file. Select it again and allow photo access.'); }
      }
      fileUri = temporary;
      info = await FileSystem.getInfoAsync(fileUri);
    }
    if (!info.exists || info.isDirectory || !info.size) throw new Error('This file is empty or unavailable. Choose another file.');
    if (info.size > maxSize) throw new Error('Choose a file smaller than 20 MB.');
    task = FileSystem.createUploadTask(url, fileUri, {
      httpMethod: 'POST', uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: field, mimeType,
      parameters: { upload_preset: preset },
      headers: { Accept: 'application/json' },
    });
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        void task?.cancelAsync().catch(() => undefined);
        reject(new Error('The upload timed out. Check your connection and retry.'));
      }, 120000);
    });
    const response = await Promise.race([task.uploadAsync(), timeout]);
    if (!response) throw new Error('The upload was cancelled. Please retry.');
    let payload: any;
    try { payload = JSON.parse(response.body); } catch { payload = null; }
    if (response.status < 200 || response.status >= 300) {
      if (response.status === 401) throw new Error('Cloudinary rejected the unsigned preset. Check its configuration.');
      if (response.status === 413) throw new Error('Choose a file smaller than 20 MB.');
      throw new Error(payload?.error?.message || payload?.message || `Upload failed (${response.status}). Please retry.`);
    }
    if (!payload) throw new Error('The upload server returned an invalid response. Please retry.');
    return confirmedUpload(payload);
  } catch (error) {
    if (timedOut) throw new Error('The upload timed out. Check your connection and retry.');
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
    if (temporary) await FileSystem.deleteAsync(temporary, { idempotent: true }).catch(() => undefined);
  }
}
function confirmedUpload(payload: any): any {
  const url = payload?.secure_url;
  if (!payload?.public_id || typeof url !== 'string' || !/^https:\/\/res\.cloudinary\.com\//i.test(url)) throw new Error('Cloudinary did not return a secure file link. Please retry.');
  return { ...payload, data: { url, secureUrl: url, publicId: payload.public_id, resourceType: payload.resource_type } };
}
export async function uploadFile(url: string, field: string, uri: string, selectedName?: string, selectedMimeType?: string, selectedBase64?: string | null): Promise<any> {
  const cloud = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const preset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();
  if (!cloud || !/^[a-zA-Z0-9_-]+$/.test(cloud) || !preset) throw new Error('Uploads are not configured. Set the Cloudinary cloud name and unsigned upload preset.');
  url = `https://api.cloudinary.com/v1_1/${cloud}/auto/upload`;
  field = 'file';
  let filename = (selectedName || uri.split(/[?#]/)[0].split('/').pop() || 'upload.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
  let mimeType = selectedMimeType || types[filename.split('.').pop()?.toLowerCase() || ''] || 'application/octet-stream';
  if (Platform.OS !== 'web') return uploadNative(url, field, uri, filename, mimeType, preset, selectedBase64);
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
    }
    if (!base64) throw new Error('This file is empty. Choose another file.');
    const size = Math.floor(base64.length * 3 / 4) - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);
    if (size > maxSize) throw new Error('Choose a file smaller than 20 MB.');
    const response = await fetch(url, {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `upload_preset=${encodeURIComponent(preset)}&file=${encodeURIComponent(`data:${mimeType};base64,${base64}`)}`, signal: controller.signal,
    });
    const text = await response.text();
    let payload: any;
    try { payload = JSON.parse(text); } catch { payload = null; }
    if (!response.ok) {
      if (response.status === 401) throw new Error('Cloudinary rejected the unsigned preset. Check its configuration.');
      if (response.status === 413) throw new Error('Choose a file smaller than 20 MB.');
      throw new Error(payload?.error?.message || payload?.message || `Upload failed (${response.status}). Please retry.`);
    }
    if (!payload) throw new Error('The upload server returned an invalid response. Please retry.');
    return confirmedUpload(payload);
  } catch (error) {
    if (controller.signal.aborted) throw new Error('The upload timed out. Check your connection and retry.');
    throw error;
  } finally { clearTimeout(timer); }
}
