const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dfxxwj8zx';
const UPLOAD_PRESET = 'mota_unsigned';

export async function uploadToCloudinary(
  uri: string,
  folder: string = 'mota-docs'
): Promise<string> {
  const formData = new FormData();

  const filename = uri.split('/').pop() || 'upload.jpg';
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeType = ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  formData.append('file', {
    uri,
    name: filename,
    type: mimeType,
  } as any);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`,
    {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' },
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Cloudinary upload failed: ${err}`);
  }

  const data = await response.json();
  if (!data.secure_url) throw new Error('No URL returned from Cloudinary');
  return data.secure_url;
}
