import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import type { TableName } from '@mere/domain';
import type { ExportProgress, PackageCommands } from '@mere/data';
import { getDb, type MereDb } from './db';
import {
  decryptBytes,
  encryptBytes,
  fromBase64,
  PBKDF2_ITERATIONS,
  toBase64,
} from './crypto';
import {
  ENVELOPE_MAGIC,
  ENVELOPE_MAGIC_BYTES,
  FORMAT_NAME,
  FORMAT_VERSION,
  type EnvelopeHeader,
  type PackageManifest,
} from './package-format';

const TABLES: readonly TableName[] = [
  'users',
  'user_preferences',
  'connections',
  'clinical_documents',
  'attachments',
  'instance_config',
  'summary_page_preferences',
];

function isEnvelope(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== ENVELOPE_MAGIC_BYTES[i]) return false;
  }
  return true;
}

function readEnvelope(bytes: Uint8Array): { header: EnvelopeHeader; ciphertext: Uint8Array } {
  if (!isEnvelope(bytes)) {
    throw new Error(`Not a ${ENVELOPE_MAGIC} envelope.`);
  }
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const headerLen = dv.getUint32(8, true);
  if (12 + headerLen > bytes.length) {
    throw new Error('Truncated envelope header.');
  }
  const headerJson = new TextDecoder().decode(
    bytes.subarray(12, 12 + headerLen),
  );
  const header = JSON.parse(headerJson) as EnvelopeHeader;
  if (header.v !== 1 || header.enc !== 'AES-GCM' || header.kdf !== 'PBKDF2-SHA256') {
    throw new Error('Unsupported envelope header.');
  }
  const ciphertext = bytes.subarray(12 + headerLen);
  return { header, ciphertext };
}

function writeEnvelope(header: EnvelopeHeader, ciphertext: Uint8Array): Uint8Array {
  const headerBytes = strToU8(JSON.stringify(header));
  const out = new Uint8Array(12 + headerBytes.length + ciphertext.length);
  out.set(ENVELOPE_MAGIC_BYTES, 0);
  const dv = new DataView(out.buffer);
  dv.setUint32(8, headerBytes.length, true);
  out.set(headerBytes, 12);
  out.set(ciphertext, 12 + headerBytes.length);
  return out;
}

async function buildZip(
  db: MereDb,
  onProgress?: (p: ExportProgress) => void,
): Promise<{ zip: Uint8Array; manifest: PackageManifest }> {
  const files: Record<string, Uint8Array> = {};
  const counts: Record<string, number> = {};
  let attachmentCount = 0;

  const totalSteps = TABLES.length + 2; // tables + attachments + manifest
  let step = 0;

  for (const t of TABLES) {
    onProgress?.({ phase: 'tables', table: t, done: step, total: totalSteps });
    const rows = await db.table(t).toArray();
    counts[t] = rows.length;
    files[`tables/${t}.json`] = strToU8(JSON.stringify(rows));
    step++;
  }

  onProgress?.({ phase: 'attachments', done: step, total: totalSteps });
  const blobs = await db.attachment_blobs.toArray();
  for (const b of blobs) {
    files[`attachments/${b.id}`] = b.bytes;
    attachmentCount++;
  }
  step++;

  const manifest: PackageManifest = {
    format: FORMAT_NAME,
    version: FORMAT_VERSION,
    createdAt: Date.now(),
    schema: { version: 1 },
    tables: [...TABLES],
    counts,
    attachmentCount,
  };
  files['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2));
  step++;

  onProgress?.({ phase: 'sealing', done: step, total: totalSteps });
  const zip = zipSync(files, { level: 6 });
  return { zip, manifest };
}

async function readZip(zip: Uint8Array): Promise<{
  manifest: PackageManifest;
  tableRows: Record<string, unknown[]>;
  attachments: Record<string, Uint8Array>;
}> {
  const files = unzipSync(zip);
  const manifestBytes = files['manifest.json'];
  if (!manifestBytes) throw new Error('Package is missing manifest.json');
  const manifest = JSON.parse(strFromU8(manifestBytes)) as PackageManifest;
  if (manifest.format !== FORMAT_NAME) {
    throw new Error(`Unexpected package format: ${manifest.format}`);
  }
  if (manifest.version > FORMAT_VERSION) {
    throw new Error(
      `Package was created by a newer version (v${manifest.version}); this build supports up to v${FORMAT_VERSION}.`,
    );
  }
  const tableRows: Record<string, unknown[]> = {};
  const attachments: Record<string, Uint8Array> = {};
  for (const [path, bytes] of Object.entries(files)) {
    if (path.startsWith('tables/') && path.endsWith('.json')) {
      const name = path.slice('tables/'.length, -'.json'.length);
      tableRows[name] = JSON.parse(strFromU8(bytes)) as unknown[];
    } else if (path.startsWith('attachments/')) {
      const id = path.slice('attachments/'.length);
      if (id) attachments[id] = bytes;
    }
  }
  return { manifest, tableRows, attachments };
}

export function createPackageCommands(dbName: string): PackageCommands {
  return {
    async export(opts) {
      const db = getDb(dbName);
      const { zip } = await buildZip(db, opts?.onProgress);
      if (!opts?.passphrase) {
        opts?.onProgress?.({ phase: 'done', done: 1, total: 1 });
        return zip;
      }
      const enc = await encryptBytes(zip, opts.passphrase);
      const header: EnvelopeHeader = {
        v: 1,
        enc: 'AES-GCM',
        kdf: 'PBKDF2-SHA256',
        iter: enc.iterations,
        salt: toBase64(enc.salt),
        iv: toBase64(enc.iv),
      };
      const out = writeEnvelope(header, enc.ciphertext);
      opts.onProgress?.({ phase: 'done', done: 1, total: 1 });
      return out;
    },

    async import(bytes, opts) {
      let zipBytes = bytes;
      if (isEnvelope(bytes)) {
        if (!opts?.passphrase) {
          throw new Error('Package is encrypted; passphrase is required.');
        }
        const { header, ciphertext } = readEnvelope(bytes);
        zipBytes = await decryptBytes(
          ciphertext,
          opts.passphrase,
          fromBase64(header.salt),
          fromBase64(header.iv),
          header.iter ?? PBKDF2_ITERATIONS,
        );
      }

      const { manifest, tableRows, attachments } = await readZip(zipBytes);
      const merge = opts?.merge ?? 'replace';
      const db = getDb(dbName);
      const tables = manifest.tables.filter((t): t is TableName =>
        (TABLES as readonly string[]).includes(t),
      );

      const totalSteps = tables.length + 1;
      let step = 0;
      const counts: Partial<Record<TableName, number>> = {};

      await db.transaction(
        'rw',
        [
          db.users,
          db.user_preferences,
          db.connections,
          db.clinical_documents,
          db.attachments,
          db.attachment_blobs,
          db.instance_config,
          db.summary_page_preferences,
        ],
        async () => {
          for (const t of tables) {
            opts?.onProgress?.({
              phase: 'tables',
              table: t,
              done: step,
              total: totalSteps,
            });
            const rows = (tableRows[t] ?? []) as Array<Record<string, unknown>>;
            const table = db.table(t);
            if (merge === 'replace') {
              await table.clear();
              await table.bulkAdd(rows as never);
            } else {
              await table.bulkPut(rows as never);
            }
            counts[t] = rows.length;
            step++;
          }
          opts?.onProgress?.({
            phase: 'attachments',
            done: step,
            total: totalSteps,
          });
          if (merge === 'replace') {
            await db.attachment_blobs.clear();
          }
          const blobRows = Object.entries(attachments).map(([id, b]) => ({
            id,
            bytes: b,
          }));
          if (blobRows.length) await db.attachment_blobs.bulkPut(blobRows);
          step++;
        },
      );

      opts?.onProgress?.({ phase: 'done', done: totalSteps, total: totalSteps });
      return { counts };
    },

    async inspect(bytes) {
      if (isEnvelope(bytes)) {
        return { encrypted: true, formatVersion: FORMAT_VERSION };
      }
      try {
        const files = unzipSync(bytes);
        const m = files['manifest.json'];
        if (!m) return { encrypted: false, formatVersion: 0 };
        const manifest = JSON.parse(strFromU8(m)) as PackageManifest;
        return {
          encrypted: false,
          formatVersion: manifest.version,
          appVersion: manifest.app?.version,
          createdAt: manifest.createdAt,
        };
      } catch {
        return { encrypted: false, formatVersion: 0 };
      }
    },
  };
}
