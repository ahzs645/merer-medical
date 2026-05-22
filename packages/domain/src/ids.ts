export type AppId = string;

const HEX = '0123456789abcdef';

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(out);
    return out;
  }
  for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
  return out;
}

function toHex(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    s += HEX[(b >> 4) & 0xf] + HEX[b & 0xf];
  }
  return s;
}

export function createId(prefix?: string): AppId {
  const ts = Date.now().toString(36).padStart(9, '0');
  const rnd = toHex(randomBytes(10));
  return prefix ? `${prefix}_${ts}${rnd}` : `${ts}${rnd}`;
}

export function isAppId(value: unknown): value is AppId {
  return typeof value === 'string' && value.length >= 8 && value.length <= 80;
}
