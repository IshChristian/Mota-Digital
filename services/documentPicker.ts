import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
// Android retains the provider URI permission for the modern reader.
// iOS uses a picker-owned copy for security-scoped documents.
export async function pickUploadDocument() {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: false, copyToCacheDirectory: Platform.OS !== "android" });
  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset?.uri) throw new Error('No readable file was selected. Download a copy and select it again.');
  if (asset.size != null && asset.size > MAX_UPLOAD_BYTES) throw new Error('Choose a file smaller than 20 MB.');
  if (asset.size === 0) throw new Error('This file is empty. Choose another file.');
  return asset;
}
