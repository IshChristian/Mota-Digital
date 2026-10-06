import { File } from "expo-file-system";
import * as Legacy from "expo-file-system/legacy";

export async function readNativeUpload(
  selectedUri: string,
  maxBytes: number,
): Promise<string> {
  const uri = selectedUri.startsWith("/")
    ? `file://${selectedUri.replace(/^\/+/, "/")}`
    : selectedUri.replace(/^file:\/{3,}/i, "file:///");
  let temporary: string | undefined;
  const inspect = async (fileUri: string) => {
    let info;
    try {
      info = await Legacy.getInfoAsync(fileUri);
    } catch {
      throw new Error(
        "Could not inspect the selected file. Download a local copy and select it again.",
      );
    }
    if (!info.exists || info.isDirectory || !info.size)
      throw new Error("This file is empty or unavailable. Select it again.");
    if (info.size > maxBytes)
      throw new Error("Choose a file smaller than 20 MB.");
  };
  const modernRead = async (fileUri: string) => {
    const file = new File(fileUri);
    if (file.size > maxBytes)
      throw new Error("Choose a file smaller than 20 MB.");
    return await file.base64();
  };
  const copyToCache = async () => {
    if (!Legacy.cacheDirectory)
      throw new Error("Upload storage is unavailable. Restart the app.");
    temporary = `${Legacy.cacheDirectory.replace(/^file:\/{3,}/i, "file:///")}mota-upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      await Legacy.copyAsync({ from: uri, to: temporary });
    } catch {
      throw new Error(
        "Could not read this file. Download it to your device and select it again.",
      );
    }
    await inspect(temporary);
    return temporary;
  };
  try {
    // Content-provider permission may be temporary. Cache it before reading.
    let readable = uri.startsWith("file://") ? uri : await copyToCache();
    await inspect(readable);
    try {
      return await modernRead(readable);
    } catch {
      // Some provider/file URLs can be inspected but cannot be opened. Retry
      // from a new app-owned copy before using the older reader as fallback.
      if (!temporary) readable = await copyToCache();
      try {
        return await modernRead(readable);
      } catch {
        try {
          return await Legacy.readAsStringAsync(readable, {
            encoding: Legacy.EncodingType.Base64,
          });
        } catch {
          throw new Error(
            "Android could not open the selected file. Download a local copy and select it again, or take a new photo.",
          );
        }
      }
    }
  } finally {
    if (temporary)
      await Legacy.deleteAsync(temporary, { idempotent: true }).catch(
        () => undefined,
      );
  }
}
