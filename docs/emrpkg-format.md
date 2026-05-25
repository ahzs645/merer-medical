# `.emrpkg` file format (v1)

A `.emrpkg` is a single-file container for a Mere Medical user's entire
local store: clinical documents, connections, user records, preferences,
attachments, and config. It's designed to be importable into any Mere
install, optionally encrypted with a passphrase.

This document is the normative spec. The reference implementation lives
in `packages/local-dexie/src/exportImport.ts` and
`packages/local-dexie/src/package-format.ts`.

## On-disk variants

A `.emrpkg` is one of two things on disk:

| Variant     | First 8 bytes      | Body                                                  |
| ----------- | ------------------ | ----------------------------------------------------- |
| Unencrypted | `PK\x03\x04...`    | A regular ZIP archive (see below).                    |
| Encrypted   | `MEREPKG1` (ASCII) | Envelope header + AES-GCM ciphertext of the same ZIP. |

A reader detects the variant by the first 8 bytes. Both share the same
file extension, so a `.emrpkg` is type-sniffed not name-sniffed.

## Encrypted envelope

```text
offset  size       contents
──────  ─────────  ──────────────────────────────────────────────────────
0       8          magic "MEREPKG1" (ASCII)
8       4          header length N, little-endian uint32
12      N          header JSON, UTF-8 (see below)
12+N    remainder  AES-GCM ciphertext (authentication tag suffix included)
```

The header JSON is intentionally minimal — it describes the KDF + cipher
parameters and nothing else. App version, table counts, etc. live in the
_encrypted_ `manifest.json` so they leak no information about the user's
data.

```json
{
  "v": 1,
  "enc": "AES-GCM",
  "kdf": "PBKDF2-SHA256",
  "iter": 600000,
  "salt": "<base64, 16 bytes>",
  "iv": "<base64, 12 bytes>"
}
```

Key derivation:

```text
key = PBKDF2-SHA256(passphrase, salt, iter, dkLen=32)
plaintext_zip = AES-GCM-decrypt(ciphertext, key, iv, ad=empty)
```

Constants (current defaults; readers must respect whatever is in the
header, writers should not go below these):

| Parameter  | Value           |
| ---------- | --------------- |
| KDF        | PBKDF2-SHA256   |
| Iterations | 600,000         |
| Salt       | 16 random bytes |
| Cipher     | AES-256-GCM     |
| IV         | 12 random bytes |
| AD         | empty           |

The auth tag is appended by WebCrypto's `subtle.encrypt`, so the
ciphertext blob is `len(plaintext) + 16` bytes.

### Passkey (WebAuthn PRF) key derivation

As an alternative to a passphrase, the AES-GCM key can be derived from a
passkey using the WebAuthn [PRF extension](https://w3c.github.io/webauthn/#prf-extension).
The envelope header records `kdf: "webauthn-prf"` and the metadata needed
to re-derive the key on import:

```json
{
  "v": 1,
  "enc": "AES-GCM",
  "kdf": "webauthn-prf",
  "iv": "<base64, 12 bytes>",
  "credentialId": "<base64 of the passkey rawId>",
  "prfSalt": "<base64, 32 bytes>"
}
```

Key derivation:

```text
prf_secret = WebAuthn assertion(credentialId).prf.results.first  // 32 bytes
key        = HKDF-SHA256(prf_secret, salt=empty, info="mere-emrpkg-aes-gcm-v1", dkLen=32)
plaintext_zip = AES-GCM-decrypt(ciphertext, key, iv, ad=empty)
```

No passphrase is stored or required; importing prompts the user to touch
the same passkey. The PRF extension is required — authenticators without
it cannot produce the key. The credential id and salt are non-secret and
safe to store in the (unencrypted) header.

> **At-rest idea (not yet implemented).** The same PRF-derived key could
> unlock the local RxDB store at startup, replacing the passphrase prompt
> in `RxDbProvider`'s encrypted-database flow. That requires threading a
> `CryptoKey` (rather than a passphrase string) through `initEncryptedRxDb`
> and the storage adapter, and is tracked as a separate, larger change.

## ZIP contents

The unencrypted ZIP — whether that's the on-disk file or the plaintext
recovered after decryption — has exactly this layout:

```text
manifest.json
tables/<table-name>.json   (one file per logical table; rows is a JSON array)
attachments/<id>           (raw bytes, no extension; mime is in the manifest)
```

### `manifest.json`

```json
{
  "format": "mere-emr-package",
  "version": 1,
  "createdAt": 1716336000000,
  "app": { "name": "mere-medical", "version": "0.4.2" },
  "schema": { "version": 1 },
  "tables": ["user_documents", "connection_documents", "clinical_documents"],
  "counts": { "user_documents": 1, "connection_documents": 3, "clinical_documents": 412 },
  "attachmentCount": 0
}
```

| Field             | Required | Notes                                                                        |
| ----------------- | -------- | ---------------------------------------------------------------------------- |
| `format`          | yes      | Must be the literal string `mere-emr-package`. Readers reject anything else. |
| `version`         | yes      | Format version. Readers reject `> FORMAT_VERSION` they support.              |
| `createdAt`       | yes      | Epoch ms at export time.                                                     |
| `app`             | no       | Producer hints; readers must not require any specific value.                 |
| `schema.version`  | yes      | Schema version of the _records inside_. See "Record shapes" below.           |
| `tables`          | yes      | Ordered list of table names; each corresponds to `tables/<name>.json`.       |
| `counts`          | yes      | Per-table row count. Used for progress bars; not authoritative.              |
| `attachmentCount` | yes      | Number of files under `attachments/`.                                        |

### Record shapes

Mere has two stores in flight; the same envelope format carries either
shape. The `tables` array tells you which is in the package:

| Table names like…                                                    | Shape                                     | Producer                                      |
| -------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------- |
| `user_documents`, `connection_documents`, `clinical_documents`       | RxDB legacy (snake_case)                  | `apps/web/src/services/emrpkg/`               |
| `users`, `connections`, `clinical_documents` (with camelCase fields) | `@mere/domain` (camelCase, app-level IDs) | `@mere/local-dexie`'s `createPackageCommands` |

Readers should switch on the presence of `user_documents` vs `users` to
pick a deserialiser. A future "smart import" can ingest either shape.

### Attachments

Attachments are stored as raw bytes under `attachments/<id>`. Today the
Dexie-sourced exporter is the only one that uses this folder; the
RxDB-sourced exporter still leaves embedded base64 inside FHIR resources
in `clinical_documents.json`. The format permits either; the manifest's
`attachmentCount` reflects what's actually in the folder.

When attachments are extracted, the corresponding `attachments` table row
carries `{ id, ownerType, ownerId, mime, size, sha256? }`. The bytes are
linked by `id` to the `attachments/<id>` file in the zip.

## Pure helper API

`@mere/local-dexie` exports the format-handling helpers separately from
any store binding so callers can pack from any source (e.g. RxDB):

```ts
import { packEmrpkg, unpackEmrpkg, inspectEmrpkg } from '@mere/local-dexie';

// Pack any in-memory dump
const bytes = await packEmrpkg(
  {
    manifest: { createdAt: Date.now(), schema: { version: 1 }, tables: [...], counts: {...}, attachmentCount: 0 },
    tableFiles: { users: jsonAsUint8Array },
    attachments: { att_abc: rawBytes },
  },
  { passphrase: 'optional' },
);

// Cheap header inspection (doesn't decrypt, doesn't parse tables)
const info = await inspectEmrpkg(bytes);
// { encrypted: true, formatVersion: 1, kdf?, appVersion?, createdAt? }

// Reverse
const { manifest, tableFiles, attachments } = await unpackEmrpkg(bytes, {
  passphrase: 'required if encrypted',
});
```

## Conformance checklist

A conforming reader must:

1. Detect encrypted vs plain via the first 8 bytes (`MEREPKG1` or ZIP local
   header `PK\x03\x04`).
2. Reject any package whose `manifest.format` is not `mere-emr-package`.
3. Reject any package whose `manifest.version` is greater than the
   format version it implements.
4. Use the KDF/cipher parameters from the envelope header, not hardcoded
   constants — readers must accept future iteration counts ≥ the version-1
   minimum.
5. Treat unknown tables as a soft skip (warn + continue), so adding tables
   in v1 doesn't break older readers.

A conforming writer must:

1. Emit `manifest.format = "mere-emr-package"` and `manifest.version = 1`.
2. Use at least the default KDF parameters from this document.
3. Include `attachmentCount` matching the actual number of files under
   `attachments/`.
4. Not put plaintext PHI in the envelope header JSON.
