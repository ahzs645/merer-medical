/**
 * .emrpkg — Mere EMR package format
 *
 * Two on-disk variants share the same logical contents:
 *
 * 1. UNENCRYPTED (just a ZIP)
 *    A plain ZIP archive containing:
 *      manifest.json
 *      tables/<table>.json          // one file per table, array of records
 *      attachments/<attachmentId>   // raw bytes, no extension; mime in attachments.json
 *
 * 2. ENCRYPTED (envelope wrapping an AES-GCM ciphertext of the same ZIP)
 *
 *    | offset | size      | contents                                          |
 *    |--------|-----------|---------------------------------------------------|
 *    | 0      | 8         | magic "MEREPKG1" (ASCII)                          |
 *    | 8      | 4         | header length N, little-endian uint32             |
 *    | 12     | N         | header JSON, UTF-8 (see EnvelopeHeader)           |
 *    | 12+N   | remainder | AES-GCM ciphertext (auth tag is appended by WebCrypto) |
 *
 *    The header JSON describes the KDF + cipher parameters but contains NO
 *    plaintext metadata about the user's data. App version, counts, etc. are
 *    inside the encrypted manifest.
 */

export const FORMAT_NAME = 'mere-emr-package';
export const FORMAT_VERSION = 1;

export const ENVELOPE_MAGIC = 'MEREPKG1';
export const ENVELOPE_MAGIC_BYTES = new Uint8Array([
  0x4d, 0x45, 0x52, 0x45, 0x50, 0x4b, 0x47, 0x31,
]);

export interface EnvelopeHeader {
  v: 1;
  enc: 'AES-GCM';
  kdf: 'PBKDF2-SHA256';
  iter: number;
  salt: string; // base64
  iv: string; // base64
}

export interface PackageManifest {
  format: typeof FORMAT_NAME;
  version: typeof FORMAT_VERSION;
  createdAt: number;
  app?: { name?: string; version?: string };
  schema: { version: number };
  tables: string[];
  counts: Record<string, number>;
  attachmentCount: number;
}
