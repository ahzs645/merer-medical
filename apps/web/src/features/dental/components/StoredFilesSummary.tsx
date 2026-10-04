import { useState } from 'react';

import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import {
  formatBytes,
  type FileSetSummary,
} from '../../../shared/storage/fileStore';
import { downloadFileSet } from '../../../shared/storage/fileSetZip';
import { canOpenInViewer, CbctViewerDialog } from './CbctViewerDialog';

/**
 * A record whose files live in the file store (a scan, a CBCT folder), shown
 * where a single embedded file would be: what's there, a zip download, and —
 * for DICOM — the CBCT viewer.
 */
export function StoredFilesSummary({ fileSet }: { fileSet: FileSetSummary }) {
  const { t } = useInterfaceLanguage();
  const [viewing, setViewing] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className="p-4 text-sm text-gray-800">
      <p>
        {(fileSet.count === 1 ? t('{count} file') : t('{count} files')).replace(
          '{count}',
          `${fileSet.count}`,
        )}
        {' · '}
        {formatBytes(fileSet.totalSize)}
        {fileSet.kind === 'dicom' ? ` · ${t('DICOM study')}` : ''}
      </p>
      <ul className="mt-1 text-xs text-gray-600">
        {fileSet.sample.map((path) => (
          <li key={path} className="truncate">
            {path}
          </li>
        ))}
        {fileSet.count > fileSet.sample.length && <li>…</li>}
      </ul>
      <div className="mt-2 flex flex-wrap gap-2">
        {canOpenInViewer(fileSet) && (
          <button
            type="button"
            onClick={() => setViewing(true)}
            className="inline-flex min-h-[44px] items-center rounded-md bg-primary-800 px-3 text-sm font-semibold text-white hover:bg-primary-700"
          >
            {t('Open in CBCT viewer')}
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await downloadFileSet(fileSet);
            } finally {
              setBusy(false);
            }
          }}
          className="inline-flex min-h-[44px] items-center rounded-md px-3 text-sm font-medium text-primary-700 ring-1 ring-primary-200 hover:bg-gray-50 disabled:opacity-60"
        >
          {busy ? t('Preparing…') : t('Download (.zip)')}
        </button>
      </div>
      {viewing && (
        <CbctViewerDialog fileSet={fileSet} onClose={() => setViewing(false)} />
      )}
    </div>
  );
}
