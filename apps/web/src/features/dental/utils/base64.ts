/** base64 (with or without a data: prefix) → bytes. */
export function base64ToArrayBuffer(data: string): ArrayBuffer {
  const binary = atob(data.replace(/^data:[^,]*,/, '').replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
