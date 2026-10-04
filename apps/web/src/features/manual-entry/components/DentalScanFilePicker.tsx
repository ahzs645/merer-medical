import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import {
  classifyFileSet,
  formatBytes,
  type FileSetSummary,
} from '../../../shared/storage/fileStore';

const inputClass = 'sr-only';
const buttonClass =
  'inline-flex min-h-[44px] cursor-pointer items-center rounded-md border border-primary-300 bg-white px-3 text-sm font-semibold text-primary-800 shadow-sm hover:bg-primary-50 focus-within:ring-2 focus-within:ring-primary-500';

/**
 * Files for a dental image or scan: one or several (an X-ray, a photo, an
 * STL or PLY), or a whole folder (a CBCT is hundreds of DICOM slices). They
 * are kept in the file store, not inside the record, so a CBCT is possible
 * at all and a scan doesn't make a 15 MB record.
 */
export function DentalScanFilePicker({
  storedFiles,
  existingFileSet,
  missing,
  onChange,
}: {
  storedFiles: File[];
  existingFileSet?: Pick<
    FileSetSummary,
    'label' | 'count' | 'totalSize' | 'kind'
  >;
  missing: boolean;
  onChange: (files: File[]) => void;
}) {
  const { t } = useInterfaceLanguage();
  const totalSize = storedFiles.reduce((total, file) => total + file.size, 0);
  const kind = classifyFileSet(storedFiles);

  return (
    <div>
      <p className="block text-sm font-semibold text-gray-900">{t('Files')}</p>
      <p className="mt-1 text-sm text-gray-600">
        {t(
          'An X-ray, photo or 3D scan (STL, PLY), or a whole CBCT folder of DICOM files.',
        )}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <label className={buttonClass}>
          {t('Choose files')}
          <input
            id="manual-record-file"
            type="file"
            multiple
            className={inputClass}
            aria-invalid={missing}
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              if (files.length) onChange(files);
            }}
          />
        </label>
        <label className={buttonClass}>
          {t('Choose a folder')}
          <input
            id="manual-record-folder"
            type="file"
            multiple
            className={inputClass}
            // Non-standard but supported by Chromium, Firefox and Safari.
            {...({ webkitdirectory: '', directory: '' } as Record<
              string,
              string
            >)}
            onChange={(event) => {
              const files = Array.from(event.target.files || []).filter(
                (file) => !/(^|\/)\.[^/]+$/.test(file.name),
              );
              if (files.length) onChange(files);
            }}
          />
        </label>
      </div>
      {storedFiles.length > 0 ? (
        <p className="mt-2 text-sm text-gray-800" aria-live="polite">
          {storedFiles.length === 1
            ? `${storedFiles[0].name} · ${formatBytes(totalSize)}`
            : t('{count} files · {size}')
                .replace('{count}', `${storedFiles.length}`)
                .replace('{size}', formatBytes(totalSize))}
          {kind === 'dicom' && ` · ${t('DICOM study')}`}
        </p>
      ) : existingFileSet ? (
        <p className="mt-2 text-sm text-gray-700">
          {t(
            'Saved: {label}, {count} files · {size}. Choose new files to replace them.',
          )
            .replace('{label}', existingFileSet.label)
            .replace('{count}', `${existingFileSet.count}`)
            .replace('{size}', formatBytes(existingFileSet.totalSize))}
        </p>
      ) : null}
      {missing && (
        <p role="alert" className="mt-1 text-xs font-medium text-red-600">
          {t('Choose a file or a folder before saving.')}
        </p>
      )}
    </div>
  );
}
