import * as DocumentPicker from 'expo-document-picker';
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
// Cache cloud-provider files while the picker still grants access to them.
export async function pickUploadDocument() {
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: false, copyToCacheDirectory: true });
  if (result.canceled) return null;
  const asset = result.assets?.[0];
  if (!asset?.uri) throw new Error('No readable file was selected. Download a copy and select it again.');
  if (asset.size != null && asset.size > MAX_UPLOAD_BYTES) throw new Error('Choose a file smaller than 20 MB.');
  if (asset.size === 0) throw new Error('This file is empty. Choose another file.');
  return asset;
}
