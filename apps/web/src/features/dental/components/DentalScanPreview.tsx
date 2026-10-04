import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Routes as AppRoutes } from '../../../Routes';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { ImagingItem } from '../../imaging/types';
import {
  getFileSet,
  getRecordFileSet,
} from '../../../shared/storage/fileStore';
import { base64ToArrayBuffer } from '../utils/base64';

const DentalScanCanvas = lazy(() => import('./DentalScanCanvas'));
type ScanFormat = 'stl' | 'ply';

type ScanSource = {
  id: string;
  title: string;
  contentType?: string;
  source?: string;
  /** Fetch the file's bytes, when the app holds them. */
  load?: () => Promise<ArrayBuffer>;
  format?: ScanFormat;
};

type ScanAttachment = {
  title?: string;
  contentType?: string;
  url?: string;
  data?: string;
};

type ScanResource = {
  content?: Array<{ attachment?: ScanAttachment }>;
  attachment?: ScanAttachment;
};

export function DentalScanPreview({ imaging }: { imaging: ImagingItem[] }) {
  const [webGlUnavailable, setWebGlUnavailable] = useState(
    () => !isWebGlAvailable(),
  );
  const { t } = useInterfaceLanguage();
  // Memoised so each source's `load` keeps its identity and the canvas
  // doesn't refetch on every render.
  const scanSources = useMemo(() => getDentalScanSources(imaging), [imaging]);
  const viewable = scanSources.filter((source) => source.load && source.format);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const selected =
    viewable.find((source) => source.id === selectedId) ?? viewable[0];
  const markUnavailable = useCallback(() => setWebGlUnavailable(true), []);

  return (
    <div className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {t('3D scans')}
          </h2>
          <p className="text-sm text-gray-600">
            {scanSources.length === 0
              ? t(
                  'No 3D scan file yet. Intraoral scans are usually STL or PLY files; your dental office can export them.',
                )
              : viewable.length === 0
                ? t(
                    'These scan files are listed by name only: the record does not hold the file itself, so there is nothing to draw.',
                  )
                : t('Drag to turn the scan; pinch or scroll to zoom.')}
          </p>
        </div>
        <Link
          to={`${AppRoutes.AddRecord}?specialty=dental&dental=imaging`}
          className="inline-flex min-h-[44px] w-fit shrink-0 items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
        >
          {t('Add dental image/scan')}
        </Link>
      </div>
      {selected && (
        <div className="relative mt-3 h-[320px] overflow-hidden rounded-md border border-gray-200 bg-slate-50">
          {webGlUnavailable ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-700">
              {t(
                'This browser cannot draw 3D (WebGL is off or unavailable). The file is still saved with the record.',
              )}
            </div>
          ) : (
            <Suspense
              fallback={
                <div
                  role="status"
                  className="flex h-full items-center justify-center text-sm text-slate-600"
                >
                  {t('Loading the scan…')}
                </div>
              }
            >
              <DentalScanCanvas
                key={selected.id}
                load={selected.load as () => Promise<ArrayBuffer>}
                format={selected.format as ScanFormat}
                onUnavailable={markUnavailable}
              />
            </Suspense>
          )}
        </div>
      )}
      {scanSources.length > 0 && (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {scanSources.map((source) => {
            const canView = !!(source.load && source.format);
            const isSelected = canView && selected?.id === source.id;
            return (
              <li key={source.id} className="min-w-0">
                <button
                  type="button"
                  disabled={!canView}
                  aria-pressed={canView ? isSelected : undefined}
                  onClick={() => setSelectedId(source.id)}
                  className={`flex min-h-[44px] w-full flex-col items-start rounded-md p-2 text-start ring-1 ${
                    isSelected
                      ? 'bg-primary-50 ring-primary-300'
                      : 'bg-white ring-slate-200'
                  } ${canView ? 'hover:bg-slate-50' : 'cursor-default'}`}
                >
                  <span className="w-full truncate text-sm font-medium text-slate-900">
                    {source.title}
                  </span>
                  <span className="mt-0.5 text-xs text-slate-600">
                    {canView
                      ? `${(source.format as string).toUpperCase()} · ${t('View in 3D')}`
                      : t('Listed by name; file not stored here')}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function isWebGlAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

function scanFormat(...values: (string | undefined)[]): ScanFormat | undefined {
  const text = values.filter(Boolean).join(' ');
  if (/\.ply(?:$|[?#\s])|model\/ply/i.test(text)) return 'ply';
  if (
    /\.stl(?:$|[?#\s])|model\/stl|application\/(sla|vnd\.ms-pki\.stl)/i.test(
      text,
    )
  )
    return 'stl';
  return undefined;
}

function getDentalScanSources(imaging: ImagingItem[]): ScanSource[] {
  return imaging.flatMap((item): ScanSource[] => {
    const raw = item.document.data_record.raw;
    const filename = item.document.metadata?.original_filename;
    // Files kept in the file store: one source per 3D mesh in the set.
    const fileSet = getRecordFileSet(item.document);
    if (fileSet) {
      if (fileSet.kind !== 'mesh') return [];
      return fileSet.sample
        .map((path) => ({ path, format: scanFormat(path) }))
        .filter((entry) => entry.format)
        .map(({ path, format }) => ({
          id: `${item.id}:${path}`,
          title: fileSet.count > 1 ? path.split('/').pop() || path : item.title,
          source: path,
          format,
          load: async () => {
            const file = (await getFileSet(fileSet.id)).find(
              (row) => row.relativePath === path,
            );
            if (!file) throw new Error('missing file');
            return file.blob.arrayBuffer();
          },
        }));
    }
    // A file added through the form is stored whole: the record's raw data
    // is the file, base64.
    if (typeof raw === 'string') {
      const format = scanFormat(
        filename,
        item.document.data_record.content_type,
        item.title,
      );
      if (!format) return [];
      return [
        {
          id: item.id,
          title: item.title,
          contentType: item.document.data_record.content_type,
          source: filename,
          load: async () => base64ToArrayBuffer(raw),
          format,
        },
      ];
    }

    const resource = getResource(item);
    const attachments = [
      ...(Array.isArray(resource?.content)
        ? resource.content.map((content) => content?.attachment)
        : []),
      resource?.attachment,
    ].filter(isScanAttachmentRecord);

    if (attachments.length === 0 && isScanLike(item)) {
      return [
        {
          id: item.id,
          title: item.title,
          contentType: item.attachmentType,
          source: filename || item.document.metadata?.id,
        },
      ];
    }

    return attachments
      .filter((attachment) => isScanAttachment(attachment, item))
      .map((attachment, index) => ({
        id: `${item.id}:${index}`,
        title: attachment.title || item.title,
        contentType: attachment.contentType || item.attachmentType,
        source: attachment.url || filename || item.document.metadata?.id,
        load: attachment.data
          ? async () => base64ToArrayBuffer(attachment.data as string)
          : undefined,
        format: scanFormat(
          attachment.title,
          attachment.url,
          attachment.contentType,
        ),
      }));
  });
}

function isScanLike(item: ImagingItem) {
  return (
    item.categories.includes('scan') ||
    isScanFileName(item.title) ||
    isScanContentType(item.attachmentType)
  );
}

function isScanAttachment(attachment: ScanAttachment, item: ImagingItem) {
  return (
    isScanContentType(attachment?.contentType) ||
    isScanFileName(attachment?.title) ||
    isScanFileName(attachment?.url) ||
    isScanLike(item)
  );
}

function isScanAttachmentRecord(
  attachment: ScanAttachment | undefined,
): attachment is ScanAttachment {
  return !!attachment;
}

function isScanContentType(contentType?: string) {
  return /model\/(stl|ply|obj)|application\/(sla|vnd\.ms-pki\.stl)/i.test(
    contentType || '',
  );
}

function isScanFileName(value?: string) {
  return /\.(stl|ply|obj)(?:$|[?#])/i.test(value || '');
}

function getResource(item: ImagingItem): ScanResource {
  if (typeof item.document.data_record.raw === 'string') return {};
  const raw = item.document.data_record.raw as
    | (ScanResource & { resource?: ScanResource })
    | undefined;
  return raw?.resource || raw || {};
}
