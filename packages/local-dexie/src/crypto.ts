function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c || !c.subtle) {
    throw new Error(
      'WebCrypto SubtleCrypto is not available. .emrpkg encryption requires a secure context.',
    );
  }
  return c.subtle;
}

export const PBKDF2_ITERATIONS = 600_000;
export const SALT_BYTES = 16;
export const IV_BYTES = 12;

function getRandomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  globalThis.crypto.getRandomValues(out);
  return out;
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const base = await subtle().importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return subtle().deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export interface EncryptResult {
  ciphertext: Uint8Array;
  salt: Uint8Array;
  iv: Uint8Array;
  iterations: number;
}

export async function encryptBytes(
  plaintext: Uint8Array,
  passphrase: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<EncryptResult> {
  const salt = getRandomBytes(SALT_BYTES);
  const iv = getRandomBytes(IV_BYTES);
  const key = await deriveKey(passphrase, salt, iterations);
  const ct = new Uint8Array(
    await subtle().encrypt({ name: 'AES-GCM', iv }, key, plaintext),
  );
  return { ciphertext: ct, salt, iv, iterations };
}

export async function decryptBytes(
  ciphertext: Uint8Array,
  passphrase: string,
  salt: Uint8Array,
  iv: Uint8Array,
  iterations = PBKDF2_ITERATIONS,
): Promise<Uint8Array> {
  const key = await deriveKey(passphrase, salt, iterations);
  const pt = await subtle().decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new Uint8Array(pt);
}

/**
 * Encrypt with a caller-supplied AES-GCM key. Used when the key comes from a
 * source other than a passphrase, e.g. a WebAuthn PRF-derived secret.
 */
export async function encryptBytesWithKey(
  plaintext: Uint8Array,
  key: CryptoKey,
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
  const iv = getRandomBytes(IV_BYTES);
  const ct = new Uint8Array(
    await subtle().encrypt({ name: 'AES-GCM', iv }, key, plaintext),
  );
  return { ciphertext: ct, iv };
}

/** Decrypt with a caller-supplied AES-GCM key. */
export async function decryptBytesWithKey(
  ciphertext: Uint8Array,
  key: CryptoKey,
  iv: Uint8Array,
): Promise<Uint8Array> {
  const pt = await subtle().decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new Uint8Array(pt);
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = await subtle().digest('SHA-256', bytes);
  const view = new Uint8Array(hash);
  let out = '';
  for (let i = 0; i < view.length; i++) {
    out += view[i].toString(16).padStart(2, '0');
  }
  return out;
}

export function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  if (typeof btoa === 'function') return btoa(s);
  // Node fallback
  return Buffer.from(bytes).toString('base64');
}

export function fromBase64(str: string): Uint8Array {
  if (typeof atob === 'function') {
    const bin = atob(str);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(str, 'base64'));
}
