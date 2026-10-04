import { zipSync, type Zippable } from 'fflate';

import { getFileSet, type FileSetSummary } from './fileStore';

/**
 * A stored file set as one .zip, paths kept, nothing recompressed (DICOM and
 * meshes barely compress, and storing is fast). The zip opens in CBCTer's
 * folder picker, which reads archives, and in any DICOM viewer.
 */
export async function fileSetToZip(set: FileSetSummary): Promise<Blob> {
  const rows = await getFileSet(set.id);
  const entries: Zippable = {};
  for (const row of rows) {
    let path = row.relativePath.replace(/^\/+/, '').replace(/\.\.\//g, '');
    while (entries[path]) path = `${path}-copy`;
    entries[path] = [
      new Uint8Array(await row.blob.arrayBuffer()),
      { level: 0 },
    ];
  }
  return new Blob([zipSync(entries)], { type: 'application/zip' });
}

export function safeFileName(label: string): string {
  return (
    label
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80) || 'files'
  );
}

export async function downloadFileSet(set: FileSetSummary): Promise<void> {
  const blob = await fileSetToZip(set);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeFileName(set.label)}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
