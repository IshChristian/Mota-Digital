import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

const maxSize = 20 * 1024 * 1024;
const types: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  gif: "image/gif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  pdf: "application/pdf",
  txt: "text/plain", csv: "text/csv", json: "application/json", zip: "application/zip",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  mp4: "video/mp4", mov: "video/quicktime", mp3: "audio/mpeg", wav: "audio/wav",

};
// Avoid Blob/FormData and btoa assumptions across Expo and browser implementations.
function encodeBase64(bytes: Uint8Array): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const chunks: string[] = [];
  let part = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i],
      b = bytes[i + 1],
      c = bytes[i + 2];
    part +=
      alphabet[a >> 2] +
      alphabet[((a & 3) << 4) | ((b || 0) >> 4)] +
      (i + 1 < bytes.length
        ? alphabet[((b & 15) << 2) | ((c || 0) >> 6)]
        : "=") +
      (i + 2 < bytes.length ? alphabet[c & 63] : "=");
    if (part.length >= 16384) {
      chunks.push(part);
      part = "";
    }
  }
  chunks.push(part);
  return chunks.join("");
}
// Read native files as bytes encoded in Base64; never construct multipart objects.
async function readNative(uri: string): Promise<string> {
  let temporary: string | undefined;
  try {
    let fileUri = uri;
    if (!uri.startsWith("file://")) {
      if (!FileSystem.cacheDirectory)
        throw new Error("Upload storage is unavailable. Restart the app.");
      temporary = `${FileSystem.cacheDirectory}mota-upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      try {
        await FileSystem.copyAsync({ from: uri, to: temporary });
      } catch {
        throw new Error(
          "Could not read this file. Select a downloaded copy and retry.",
        );
      }
      fileUri = temporary;
    }
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists || info.isDirectory || !info.size)
      throw new Error("This file is empty or unavailable. Select it again.");
    if (info.size > maxSize)
      throw new Error("Choose a file smaller than 20 MB.");
    return await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } finally {
    if (temporary)
      await FileSystem.deleteAsync(temporary, { idempotent: true }).catch(
        () => undefined,
      );
  }
}
function confirmedUpload(payload: any, cloud: string): any {
  const url = payload?.secure_url;
  if (
    !payload?.public_id ||
    typeof url !== "string" ||
    !url.startsWith(`https://res.cloudinary.com/${cloud}/`)
  )
    throw new Error(
      "Cloudinary did not return a secure file link. Please retry.",
    );
  return {
    ...payload,
    data: {
      url,
      secureUrl: url,
      publicId: payload.public_id,
      resourceType: payload.resource_type,
    },
  };
}
export async function uploadFile(
  url: string,
  field: string,
  uri: string,
  selectedName?: string,
  selectedMimeType?: string,
  selectedBase64?: string | null,
): Promise<any> {
  const cloud = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const preset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();
  if (!cloud || !/^[a-zA-Z0-9_-]+$/.test(cloud) || !preset)
    throw new Error(
      "Uploads are not configured. Set the Cloudinary cloud name and unsigned upload preset.",
    );
  url = `https://api.cloudinary.com/v1_1/${cloud}/auto/upload`;
  field = "file";
  let filename = (
    selectedName ||
    uri.split(/[?#]/)[0].split("/").pop() ||
    "upload.jpg"
  ).replace(/[^a-zA-Z0-9._-]/g, "_");
  let mimeType =
    (selectedMimeType && selectedMimeType !== "application/octet-stream" ? selectedMimeType : undefined) ||
    types[filename.split(".").pop()?.toLowerCase() || ""] ||
    "application/octet-stream";
  let base64 = selectedBase64 || "";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    // ImagePicker may return JPEG bytes for a HEIC source. Detect bytes rather
    // than relabelling every supplied image (including real PNGs) as JPEG.
    if (base64.startsWith('/9j/')) mimeType = 'image/jpeg';
    else if (base64.startsWith('iVBORw0KGgo')) mimeType = 'image/png';
    else if (base64.startsWith('R0lGOD')) mimeType = 'image/gif';
    if (!base64 && Platform.OS !== "web") base64 = await readNative(uri);
    if (!base64 && Platform.OS === "web") {
      const source = await fetch(uri, { signal: controller.signal });
      if (!source.ok)
        throw new Error("Could not read the selected file. Select it again.");
      const bytes = new Uint8Array(await source.arrayBuffer());
      if (bytes.length > maxSize)
        throw new Error("Choose a file smaller than 20 MB.");
      base64 = encodeBase64(bytes);
    }
    if (!base64) throw new Error("This file is empty. Choose another file.");
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0)
      throw new Error("The selected file data is invalid. Select it again.");
    const size =
      Math.floor((base64.length * 3) / 4) -
      (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
    if (size > maxSize) throw new Error("Choose a file smaller than 20 MB.");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `upload_preset=${encodeURIComponent(preset)}&file=${encodeURIComponent(`data:${mimeType};base64,${base64}`)}`,
      signal: controller.signal,
    });
    const text = await response.text();
    let payload: any;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
    if (!response.ok) {
      if (response.status === 401)
        throw new Error(
          "Cloudinary rejected the unsigned preset. Check its configuration.",
        );
      if (response.status === 413)
        throw new Error("Choose a file smaller than 20 MB.");
      throw new Error(
        payload?.error?.message ||
          payload?.message ||
          `Upload failed (${response.status}). Please retry.`,
      );
    }
    if (!payload)
      throw new Error(
        "The upload server returned an invalid response. Please retry.",
      );
    return confirmedUpload(payload, cloud);
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error("The upload timed out. Check your connection and retry.");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
