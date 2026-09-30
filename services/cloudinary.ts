import { API_BASE_URL } from './api';
import { uploadFile } from './fileUpload';

/** Upload through the authenticated backend; Cloudinary credentials stay server-side. */
export async function uploadToCloudinary(uri: string, _folder?: string, selectedName?: string, selectedMimeType?: string): Promise<string> {
  const payload = await uploadFile(`${API_BASE_URL}/uploads`, 'file', uri, selectedName, selectedMimeType);
  const url = payload?.data?.url || payload?.data?.secureUrl || payload?.url || payload?.secureUrl;
  if (typeof url !== 'string' || !/^https:\/\//i.test(url)) throw new Error('The upload response did not contain a secure file link. Please retry.');
  return url;
}
