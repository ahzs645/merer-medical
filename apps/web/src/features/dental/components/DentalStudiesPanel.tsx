import { useState } from 'react';

import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import {
  formatBytes,
  getRecordFileSet,
  type FileSetSummary,
} from '../../../shared/storage/fileStore';
import { downloadFileSet } from '../../../shared/storage/fileSetZip';
import { formatRecordDate } from '../../../shared/utils/dateFormatters';
import { ImagingItem } from '../../imaging/types';
import { canOpenInViewer, CbctViewerDialog } from './CbctViewerDialog';

/**
 * CBCT and other imaging kept as a set of files: a DICOM folder can be opened
 * in the CBCT viewer or saved as one zip. Meshes (STL/PLY) are drawn by the 3D
 * scans panel instead, so they are not listed here.
 */
export function DentalStudiesPanel({ imaging }: { imaging: ImagingItem[] }) {
  const { t } = useInterfaceLanguage();
  const [open, setOpen] = useState<FileSetSummary | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const studies = imaging
    .map((item) => ({ item, set: getRecordFileSet(item.document) }))
    .filter(
      (entry): entry is { item: ImagingItem; set: FileSetSummary } =>
        !!entry.set && entry.set.kind !== 'mesh',
    );

  if (studies.length === 0) return null;

  return (
    <section
      aria-labelledby="dental-studies"
      className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200"
    >
      <h2 id="dental-studies" className="text-base font-semibold text-gray-900">
        {t('CBCT and image files')}
      </h2>
      <ul className="mt-3 grid gap-2">
        {studies.map(({ item, set }) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-gray-50 p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">
                {item.title || set.label}
              </p>
              <p className="text-xs text-gray-600">
                {[
                  set.kind === 'dicom' ? t('DICOM study') : undefined,
                  (set.count === 1
                    ? t('{count} file')
                    : t('{count} files')
                  ).replace('{count}', `${set.count}`),
                  formatBytes(set.totalSize),
                  formatRecordDate(item.date, ''),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canOpenInViewer(set) && (
                <button
                  type="button"
                  onClick={() => setOpen(set)}
                  className="inline-flex min-h-[44px] items-center rounded-md bg-primary-800 px-3 text-sm font-semibold text-white hover:bg-primary-700"
                >
                  {t('Open in CBCT viewer')}
                </button>
              )}
              <button
                type="button"
                disabled={busy === set.id}
                onClick={async () => {
                  setBusy(set.id);
                  try {
                    await downloadFileSet(set);
                  } finally {
                    setBusy(null);
                  }
                }}
                className="inline-flex min-h-[44px] items-center rounded-md px-3 text-sm font-medium text-primary-700 ring-1 ring-primary-200 hover:bg-white disabled:opacity-60"
              >
                {busy === set.id ? t('Preparing…') : t('Download (.zip)')}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {open && (
        <CbctViewerDialog fileSet={open} onClose={() => setOpen(null)} />
      )}
    </section>
  );
}
