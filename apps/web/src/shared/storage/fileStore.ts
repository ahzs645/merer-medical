import Dexie, { type Table } from 'dexie';

/**
 * Files that belong to a record but are too big to live inside it: an
 * intraoral scan (an STL is ~11 MB), a CBCT (hundreds of DICOM slices,
 * hundreds of MB). Records used to carry an upload as base64 in their own
 * JSON, which a scan made ~15 MB documents of and a CBCT made impossible.
 *
 * A record names its files with `metadata.file_set` (see `FileSetSummary`);
 * the bytes live here, in their own IndexedDB database, as Blobs. Package
 * export and import carry them (`services/emrpkg`), so a backup holds both.
 */

export type StoredFile = {
  /** `${setId}/${index}` — stable within a set. */
  id: string;
  setId: string;
  name: string;
  /** Path inside the folder the files came from, or the name. */
  relativePath: string;
  mime: string;
  size: number;
  blob: Blob;
  createdAt: number;
};

export type FileSetKind = 'dicom' | 'mesh' | 'files';

/** What a record says about its stored files. */
export type FileSetSummary = {
  id: string;
  kind: FileSetKind;
  label: string;
  count: number;
  totalSize: number;
  /** The first few paths, so a record reads sensibly without the store. */
  sample: string[];
};

class FileStoreDb extends Dexie {
  files!: Table<StoredFile, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({ files: 'id, setId' });
  }
}

let db: FileStoreDb | null = null;

function getDb(): FileStoreDb {
  if (!db) db = new FileStoreDb('mere-files');
  return db;
}

const MESH = /\.(stl|ply|obj)$/i;

export const hasExtension = (name: string) => /\.[a-z0-9]{2,5}$/i.test(name);

/** DICOM Part 10 files carry "DICM" after a 128-byte preamble. */
export async function hasDicomSignature(file: Blob): Promise<boolean> {
  if (file.size < 132) return false;
  const bytes = new Uint8Array(await file.slice(128, 132).arrayBuffer());
  return String.fromCharCode(...bytes) === 'DICM';
}

/**
 * A set is DICOM when a file says so by name or type, or — since DICOM files
 * often have no extension at all (IM000001) — when one carries the DICOM
 * signature (`hasDicomSignature`). An extensionless folder without it is
 * still a scan folder (GALILEOS volumes look like that), just not DICOM.
 */
export function classifyFileSet(
  files: { name: string; type?: string; dicomSignature?: boolean }[],
): FileSetKind {
  if (files.length === 0) return 'files';
  if (
    files.some(
      (file) =>
        file.dicomSignature ||
        /\.(dcm|dicom)$/i.test(file.name) ||
        /dicom/i.test(file.type || ''),
    )
  ) {
    return 'dicom';
  }
  if (files.every((file) => MESH.test(file.name))) return 'mesh';
  return 'files';
}

export function relativePathOf(file: File): string {
  return (
    (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
    file.name
  );
}

/** Store a set of files; returns what the owning record should say. */
export async function putFileSet(
  setId: string,
  files: File[],
  label?: string,
): Promise<FileSetSummary> {
  const now = Date.now();
  const rows: StoredFile[] = files.map((file, index) => ({
    id: `${setId}/${index}`,
    setId,
    name: file.name,
    relativePath: relativePathOf(file),
    mime: file.type || 'application/octet-stream',
    size: file.size,
    blob: file,
    createdAt: now,
  }));
  // One extensionless file is enough to tell a DICOM folder from another
  // kind of scan folder.
  const probe = files.find((file) => !hasExtension(file.name));
  const dicomSignature = probe ? await hasDicomSignature(probe) : false;
  const store = getDb();
  await store.transaction('rw', store.files, async () => {
    await store.files.where('setId').equals(setId).delete();
    await store.files.bulkPut(rows);
  });
  return summarize(setId, rows, label, dicomSignature);
}

export function summarize(
  setId: string,
  rows: Pick<StoredFile, 'name' | 'relativePath' | 'mime' | 'size'>[],
  label?: string,
  dicomSignature = false,
): FileSetSummary {
  const folder = rows[0]?.relativePath.includes('/')
    ? rows[0].relativePath.split('/')[0]
    : undefined;
  return {
    id: setId,
    kind: classifyFileSet([
      ...rows.map((row) => ({ name: row.name, type: row.mime })),
      ...(dicomSignature ? [{ name: '', dicomSignature: true }] : []),
    ]),
    label: label || folder || rows[0]?.name || 'Files',
    count: rows.length,
    totalSize: rows.reduce((total, row) => total + row.size, 0),
    sample: rows.slice(0, 5).map((row) => row.relativePath),
  };
}

export async function getFileSet(setId: string): Promise<StoredFile[]> {
  const rows = await getDb().files.where('setId').equals(setId).toArray();
  return rows.sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath, undefined, { numeric: true }),
  );
}

export async function deleteFileSet(setId: string): Promise<void> {
  if (!isFileStoreAvailable()) return;
  await getDb().files.where('setId').equals(setId).delete();
}

/** Everything in the store, for a full backup. */
export async function listAllFiles(): Promise<StoredFile[]> {
  return getDb().files.toArray();
}

export async function putStoredFiles(rows: StoredFile[]): Promise<void> {
  if (rows.length) await getDb().files.bulkPut(rows);
}

/** Empty the store, for an import that replaces everything on the device. */
export async function deleteAllFiles(): Promise<void> {
  if (!isFileStoreAvailable()) return;
  await getDb().files.clear();
}

/** IndexedDB is missing in some test environments and locked-down browsers. */
export function isFileStoreAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

/** The set's files as File objects, paths kept, ready to hand to a viewer. */
export async function getFileSetAsFiles(setId: string): Promise<File[]> {
  return (await getFileSet(setId)).map((row) => {
    const file = new File([row.blob], row.name, { type: row.mime });
    Object.defineProperty(file, 'webkitRelativePath', {
      value: row.relativePath,
    });
    return file;
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

/** A record's file set, if it has one. */
export function getRecordFileSet(document: {
  metadata?: unknown;
}): FileSetSummary | undefined {
  const value = (document.metadata as { file_set?: unknown } | undefined)
    ?.file_set;
  if (!value || typeof value !== 'object') return undefined;
  const set = value as Partial<FileSetSummary>;
  return typeof set.id === 'string' ? (set as FileSetSummary) : undefined;
}
