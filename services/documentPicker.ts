import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

type PickedAsset = { uri: string; name: string; mimeType?: string; size?: number };

/** Photo library fallback for app builds whose native document picker is missing or broken. */
async function pickFromPhotos(): Promise<PickedAsset | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('Allow photo access to choose a document photo.');
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
  if (result.canceled) return null;
  const a = result.assets?.[0];
  if (!a?.uri) return null;
  return { uri: a.uri, name: a.fileName || `document-${Date.now()}.jpg`, mimeType: a.mimeType || 'image/jpeg', size: a.fileSize };
}

// Android retains the provider URI permission for the modern reader.
// iOS uses a picker-owned copy for security-scoped documents.
export async function pickUploadDocument(): Promise<PickedAsset | null> {
  let asset: PickedAsset | null | undefined;
  try {
    if (typeof DocumentPicker.getDocumentAsync !== 'function') throw new Error('document picker unavailable');
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: false, copyToCacheDirectory: Platform.OS !== 'android' });
    if (result.canceled) return null;
    asset = result.assets?.[0];
  } catch (error: any) {
    // "Cannot find native module" / "… is not a function": the installed app was built without the
    // document picker. Photos still work, so offer those instead of failing.
    const message = String(error?.message || error);
    if (!/native module|not a function|unavailable|ExpoDocumentPicker/i.test(message)) throw error;
    asset = await pickFromPhotos();
    if (!asset) return null;
  }
  if (!asset?.uri) throw new Error('No readable file was selected. Download a copy and select it again.');
  if (asset.size != null && asset.size > MAX_UPLOAD_BYTES) throw new Error('Choose a file smaller than 20 MB.');
  if (asset.size === 0) throw new Error('This file is empty. Choose another file.');
  return asset;
}
