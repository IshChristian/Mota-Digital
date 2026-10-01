import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { getStoredToken } from './secureStorage';

const types: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', gif: 'image/gif', bmp: 'image/bmp', tif: 'image/tiff', tiff: 'image/tiff', pdf: 'application/pdf' };
const maxSize = 20 * 1024 * 1024;
function readResponse(status: number, text: string): any {
  let payload: any;
  try { payload = JSON.parse(text); } catch { payload = null; }
  if (status < 200 || status >= 300) {
    if (status === 401) throw new Error('Your session has expired. Sign in again before uploading.');
    if (status === 413) throw new Error('Choose a file smaller than 20 MB.');
    throw new Error(payload?.message || `Upload failed (${status}). Please retry.`);
  }
  if (!payload) throw new Error('The upload server returned an invalid response. Please retry.');
  return payload;
}
function checkSize(size: number) {
  if (!size) throw new Error('This file is empty. Choose another file.');
  if (size > maxSize) throw new Error('Choose a file smaller than 20 MB.');
}
/** Native multipart is built by Expo, not by the JavaScript FormData implementation. */
export async function uploadFile(url: string, field: string, uri: string, selectedName?: string, selectedMimeType?: string): Promise<any> {
  const token = await getStoredToken();
  if (!token) throw new Error('Sign in again before uploading this file.');
  const filename = (selectedName || uri.split(/[?#]/)[0].split('/').pop() || 'upload.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const mimeType = selectedMimeType || types[extension] || 'application/octet-stream';
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
  if (Platform.OS === 'web') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);
    try {
      const source = await fetch(uri, { signal: controller.signal });
      if (!source.ok) throw new Error('Could not read the selected file. Select it again.');
      const blob = await source.blob(); checkSize(blob.size);
      const form = new FormData(); form.append(field, blob, filename);
      const response = await fetch(url, { method: 'POST', headers, body: form, signal: controller.signal });
      return readResponse(response.status, await response.text());
    } catch (error) {
      if (controller.signal.aborted) throw new Error('The upload timed out. Check your connection and retry.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  if (!FileSystem.cacheDirectory) throw new Error('File storage is unavailable. Restart the app and select the file again.');
  const cached = `${FileSystem.cacheDirectory}mota-upload-${Date.now()}-${Math.random().toString(16).slice(2)}-${filename}`;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  try {
    try { await FileSystem.copyAsync({ from: uri, to: cached }); }
    catch { throw new Error('Could not read the selected file. Select it again and allow photo access.'); }
    const info = await FileSystem.getInfoAsync(cached);
    if (!info.exists || info.isDirectory) throw new Error('Could not read the selected file. Select it again.');
    checkSize(info.size);
    const task = FileSystem.createUploadTask(url, cached, {
      httpMethod: 'POST', uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: field, mimeType, headers,
    });
    timer = setTimeout(() => { timedOut = true; void task.cancelAsync().catch(() => {}); }, 120000);
    const result = await task.uploadAsync();
    if (timedOut) throw new Error('The upload timed out. Check your connection and retry.');
    if (!result) throw new Error('The upload was cancelled. Please retry.');
    return readResponse(result.status, result.body);
  } catch (error) {
    if (timedOut) throw new Error('The upload timed out. Check your connection and retry.');
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
    await FileSystem.deleteAsync(cached, { idempotent: true }).catch(() => {});
  }
}
