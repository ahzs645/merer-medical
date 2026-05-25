/**
 * WebAuthn PRF-based key material for `.emrpkg` export/import (issue #190).
 *
 * Instead of a passphrase, the AES-GCM key is derived from a passkey using the
 * WebAuthn PRF extension: the authenticator returns a high-entropy secret for a
 * given salt, which we run through HKDF to produce the key. The credential id
 * and PRF salt are stored (unencrypted) in the package envelope so the same key
 * can be re-derived on import by touching the same passkey.
 *
 * AT-REST IDEA (not yet implemented): the same PRF-derived key could unlock the
 * local RxDB store at startup, replacing the passphrase prompt in
 * RxDbProvider's encrypted-database flow. That requires threading a CryptoKey
 * (rather than a passphrase string) through initEncryptedRxDb and the storage
 * adapter, which is a larger change tracked separately.
 */

const HKDF_INFO = 'mere-emrpkg-aes-gcm-v1';
const PRF_SALT_BYTES = 32;

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < view.length; i++) binary += String.fromCharCode(view[i]);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function randomBytes(length: number): Uint8Array {
  const out = new Uint8Array(length);
  crypto.getRandomValues(out);
  return out;
}

/** Best-effort check; true PRF support is only known after a ceremony. */
export function isWebauthnPrfMaybeSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    !!navigator.credentials &&
    window.isSecureContext
  );
}

async function deriveAesKeyFromPrf(prfOutput: ArrayBuffer): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', prfOutput, 'HKDF', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: new TextEncoder().encode(HKDF_INFO),
    },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function readPrfFirst(
  credential: PublicKeyCredential,
): ArrayBuffer | undefined {
  const results = (
    credential.getClientExtensionResults() as {
      prf?: { results?: { first?: ArrayBuffer } };
    }
  ).prf?.results;
  return results?.first;
}

/** Run an assertion against an existing credential and return its PRF output. */
async function evaluatePrf(
  credentialId: Uint8Array,
  prfSalt: Uint8Array,
): Promise<ArrayBuffer> {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      allowCredentials: [{ type: 'public-key', id: credentialId }],
      userVerification: 'preferred',
      timeout: 60_000,
      extensions: { prf: { eval: { first: prfSalt } } },
    } as PublicKeyCredentialRequestOptions,
  })) as PublicKeyCredential | null;
  if (!assertion) {
    throw new Error('Passkey assertion was cancelled.');
  }
  const prf = readPrfFirst(assertion);
  if (!prf) {
    throw new Error(
      'This passkey/authenticator does not support the PRF extension.',
    );
  }
  return prf;
}

export interface ExportPrfKey {
  key: CryptoKey;
  credentialId: string; // base64
  prfSalt: string; // base64
}

/**
 * Create a new passkey for this export and derive an AES-GCM key from its PRF
 * output. Returns the key plus the metadata needed to re-derive it on import.
 */
export async function createExportPrfKey(): Promise<ExportPrfKey> {
  if (!isWebauthnPrfMaybeSupported()) {
    throw new Error('Passkeys require a secure (HTTPS) context.');
  }
  const prfSalt = randomBytes(PRF_SALT_BYTES);
  const userId = randomBytes(16);

  const credential = (await navigator.credentials.create({
    publicKey: {
      rp: { name: 'Mere Medical' },
      user: {
        id: userId,
        name: 'mere-medical-export',
        displayName: 'Mere Medical export key',
      },
      challenge: randomBytes(32),
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
      timeout: 60_000,
      extensions: { prf: { eval: { first: prfSalt } } },
    } as PublicKeyCredentialCreationOptions,
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('Passkey creation was cancelled.');
  }

  const credentialId = new Uint8Array(credential.rawId);
  // Some authenticators only return PRF output during an assertion, so fall
  // back to a get() when create() didn't surface it.
  let prfOutput = readPrfFirst(credential);
  if (!prfOutput) {
    prfOutput = await evaluatePrf(credentialId, prfSalt);
  }

  return {
    key: await deriveAesKeyFromPrf(prfOutput),
    credentialId: toBase64(credentialId),
    prfSalt: toBase64(prfSalt),
  };
}

/** Re-derive the AES-GCM key for an encrypted package from its envelope header. */
export async function deriveImportPrfKey(header: {
  credentialId?: string;
  prfSalt?: string;
}): Promise<CryptoKey> {
  if (!isWebauthnPrfMaybeSupported()) {
    throw new Error('Passkeys require a secure (HTTPS) context.');
  }
  if (!header.credentialId || !header.prfSalt) {
    throw new Error('Package is missing passkey metadata.');
  }
  const prfOutput = await evaluatePrf(
    fromBase64(header.credentialId),
    fromBase64(header.prfSalt),
  );
  return deriveAesKeyFromPrf(prfOutput);
}
