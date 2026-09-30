/** Encode binary multipart without depending on platform FormData implementations. */
export function encodeFileMultipart(field: string, filename: string, mimeType: string, bytes: Uint8Array, boundary: string) {
  const safe = (value: string) => value.replace(/[\r\n"\\]/g, '_');
  const type = /^[\w.+-]+\/[\w.+-]+$/.test(mimeType) ? mimeType : 'application/octet-stream';
  const prefix = new TextEncoder().encode(`--${boundary}\r\nContent-Disposition: form-data; name="${safe(field)}"; filename="${safe(filename)}"\r\nContent-Type: ${type}\r\n\r\n`);
  const suffix = new TextEncoder().encode(`\r\n--${boundary}--\r\n`);
  const body = new Uint8Array(prefix.length + bytes.length + suffix.length);
  body.set(prefix); body.set(bytes, prefix.length); body.set(suffix, prefix.length + bytes.length);
  return { body, contentType: `multipart/form-data; boundary=${boundary}` };
}
