import { File, Paths } from "expo-file-system";
const unreadable = "Could not open this file. Download it to your device and select it again, or choose a new photo.";
export async function readNativeUpload(selectedUri: string, maxBytes: number): Promise<string> {
  const uri = selectedUri.startsWith("/") ? `file://${selectedUri.replace(/^\/+/, "/")}` : selectedUri.replace(/^file:\/{3,}/i, "file:///");
  if (!/^(file|content):\/\//i.test(uri)) throw new Error(unreadable);
  let temporary: File | undefined;
  let source: File;
  try { source = new File(uri); } catch { throw new Error(unreadable); }
  let size = 0;
  try { size = source.size; } catch { /* Provider metadata can be unknown. */ }
  if (size > maxBytes) throw new Error("Choose a file smaller than 20 MB.");
  try {
    let data: string;
    try { data = await source.base64(); }
    catch {
      try {
        temporary = new File(Paths.cache, `mota-upload-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        source.copy(temporary);
      } catch { throw new Error(unreadable); }
      let copiedSize = 0;
      try { copiedSize = temporary.size; } catch { /* Validate actual bytes below. */ }
      if (copiedSize > maxBytes) throw new Error("Choose a file smaller than 20 MB.");
      try { data = await temporary.base64(); } catch { throw new Error(unreadable); }
    }
    if (!data) throw new Error("This file is empty. Choose another file.");
    const bytes = Math.floor(data.length * 3 / 4) - (data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0);
    if (bytes > maxBytes) throw new Error("Choose a file smaller than 20 MB.");
    return data;
  } finally {
    try { temporary?.delete(); } catch { /* Cleanup must not replace upload feedback. */ }
  }
}
