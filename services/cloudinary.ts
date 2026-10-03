import { uploadFile } from './fileUpload';

/** Upload directly with a configured unsigned Cloudinary preset; no API secret is used. */
export async function uploadToCloudinary(uri: string, _folder?: string, selectedName?: string, selectedMimeType?: string, selectedBase64?: string | null): Promise<string> {
  const payload = await uploadFile('', 'file', uri, selectedName, selectedMimeType, selectedBase64);
  const url = payload?.data?.url || payload?.data?.secureUrl || payload?.url || payload?.secureUrl;
  if (typeof url !== 'string' || !/^https:\/\//i.test(url)) throw new Error('The upload response did not contain a secure file link. Please retry.');
  return url;
}
