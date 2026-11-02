import { File, Paths } from "expo-file-system";
import * as Legacy from "expo-file-system/legacy";

const unreadable = "Could not open this file. Download it to your device and select it again, or choose a new photo.";
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function bytesToBase64(bytes: Uint8Array) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2];
    out += B64[a >> 2] + B64[((a & 3) << 4) | ((b ?? 0) >> 4)];
    out += b === undefined ? "=" : B64[((b & 15) << 2) | ((c ?? 0) >> 6)];
    out += c === undefined ? "=" : B64[c & 63];
  }
  return out;
}

const isFn = (value: unknown): value is (...args: any[]) => any => typeof value === "function";

/**
 * Reads a picked file as base64. Tries every reader the installed native module
 * offers, because method availability differs between expo-file-system versions
 * and app binaries built before an upgrade ("x is not a function"):
 * File.base64() → File.base64Sync() → File.bytes() → legacy readAsStringAsync.
 */
async function readAny(file: any, uri: string): Promise<string> {
  const attempts: Array<() => Promise<string> | string> = [];
  if (isFn(file?.base64)) attempts.push(() => file.base64());
  if (isFn(file?.base64Sync)) attempts.push(() => file.base64Sync());
  if (isFn(file?.bytes)) attempts.push(async () => bytesToBase64(await file.bytes()));
  if (isFn((Legacy as any)?.readAsStringAsync)) attempts.push(() => (Legacy as any).readAsStringAsync(uri, { encoding: "base64" }));
  for (const attempt of attempts) {
    try {
      const data = await attempt();
      if (typeof data === "string") return data;
    } catch { /* try the next reader */ }
  }
  throw new Error(unreadable);
}

export async function readNativeUpload(selectedUri: string, maxBytes: number): Promise<string> {
  const uri = selectedUri.startsWith("/") ? `file://${selectedUri.replace(/^\/+/, "/")}` : selectedUri.replace(/^file:\/{3,}/i, "file:///");
  if (!/^(file|content):\/\//i.test(uri)) throw new Error(unreadable);
  let temporary: File | undefined;
  let source: File;
  try { source = new File(uri); } catch { throw new Error(unreadable); }
  let size = 0;
  try { size = Number(source.size) || 0; } catch { /* Provider metadata can be unknown. */ }
  if (size > maxBytes) throw new Error("Choose a file smaller than 20 MB.");
  try {
    let data: string;
    try {
      data = await readAny(source, uri);
    } catch {
      // Some providers only allow reading a private copy.
      try {
        temporary = new File(Paths.cache, `mota-upload-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        const s: any = source;
        // copy() is asynchronous in newer expo-file-system versions; it must finish before reading.
        if (isFn(s.copy)) await s.copy(temporary);
        else if (isFn(s.copySync)) s.copySync(temporary);
        else throw new Error("no copy");
      } catch { throw new Error(unreadable); }
      let copiedSize = 0;
      try { copiedSize = Number(temporary.size) || 0; } catch { /* Validate actual bytes below. */ }
      if (copiedSize > maxBytes) throw new Error("Choose a file smaller than 20 MB.");
      data = await readAny(temporary, temporary.uri);
    }
    if (!data) throw new Error("This file is empty. Choose another file.");
    const bytes = Math.floor(data.length * 3 / 4) - (data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0);
    if (bytes > maxBytes) throw new Error("Choose a file smaller than 20 MB.");
    return data;
  } finally {
    try { temporary?.delete(); } catch { /* Cleanup must not replace upload feedback. */ }
  }
}
