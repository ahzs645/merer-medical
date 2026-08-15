import { lazy, Suspense, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Routes as AppRoutes } from '../../../Routes';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { ImagingItem } from '../../imaging/types';

const DentalScanCanvas = lazy(() => import('./DentalScanCanvas'));

type ScanSource = {
  id: string;
  title: string;
  contentType?: string;
  source?: string;
};

type ScanAttachment = {
  title?: string;
  contentType?: string;
  url?: string;
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
  const scanSources = getDentalScanSources(imaging);
  const hasScanSources = scanSources.length > 0;
  const markUnavailable = useCallback(() => setWebGlUnavailable(true), []);

  return (
    <div className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {hasScanSources
              ? t('Detected dental scan sources')
              : t('Dental scans')}
          </h2>
          <p className="text-sm text-gray-600">
            {hasScanSources
              ? t(
                  'Uploaded STL, PLY, or OBJ files are listed below. The preview is demo geometry until patient scan rendering is implemented.',
                )
              : t(
                  'No dental scan source file is attached yet. Add a dental image/scan to store the source file with the record.',
                )}
          </p>
        </div>
        <Link
          to={`${AppRoutes.AddRecord}?specialty=dental&dental=imaging`}
          className="inline-flex w-fit shrink-0 items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
        >
          {t('Add dental image/scan')}
        </Link>
      </div>
      {hasScanSources ? (
        <div className="relative mt-3 h-[220px] overflow-hidden rounded-md border border-gray-200">
          {/* three.js arrives with this component, so a browser with no WebGL
              — and a tab with no scan files — never fetches it. */}
          {!webGlUnavailable && (
            <Suspense fallback={null}>
              <DentalScanCanvas onUnavailable={markUnavailable} />
            </Suspense>
          )}
          {webGlUnavailable && (
            <div className="flex h-full items-center justify-center bg-slate-50 px-6">
              <div className="w-full max-w-sm">
                <div className="relative mx-auto h-28 w-64 max-w-full rounded-b-full border-b-4 border-slate-300">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <div
                      key={index}
                      className="absolute top-7 h-11 w-5 rounded-full bg-slate-200 ring-1 ring-slate-300"
                      style={{
                        left: `${12 + index * 8}%`,
                        transform: `translateX(-50%) rotate(${(index - 4.5) * 3}deg)`,
                      }}
                    />
                  ))}
                  <div className="absolute left-[36%] top-7 h-11 w-5 rounded-full bg-sky-300 ring-1 ring-sky-400" />
                  <div className="absolute left-[64%] top-7 h-11 w-5 rounded-full bg-sky-300 ring-1 ring-sky-400" />
                </div>
                <p className="mt-4 text-center text-sm font-medium text-slate-700">
                  {t('3D preview unavailable')}
                </p>
                <p className="mt-1 text-center text-xs text-slate-500">
                  {t(
                    'Showing a static placeholder because WebGL is not available in this browser.',
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : null}
      {scanSources.length > 0 ? (
        <div className="mt-3 rounded-md bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-900">
            {t('Detected scan source files')}
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {scanSources.slice(0, 4).map((source) => (
              <div
                key={source.id}
                className="min-w-0 rounded-md bg-white p-2 ring-1 ring-slate-200"
              >
                <p className="truncate text-sm font-medium text-slate-900">
                  {source.title}
                </p>
                <p className="mt-1 truncate text-xs text-slate-600">
                  {[source.contentType, source.source]
                    .filter(Boolean)
                    .join(' · ') || t('Scan file')}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-600">
            {t(
              'These files are source attachments. The preview above remains demo geometry until patient scan rendering is implemented.',
            )}
          </p>
        </div>
      ) : null}
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

function getDentalScanSources(imaging: ImagingItem[]): ScanSource[] {
  return imaging.flatMap((item) => {
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
          source:
            item.document.metadata?.original_filename ||
            item.document.metadata?.id,
        },
      ];
    }

    return attachments
      .filter((attachment) => isScanAttachment(attachment, item))
      .map((attachment, index) => ({
        id: `${item.id}:${index}`,
        title: attachment.title || item.title,
        contentType: attachment.contentType || item.attachmentType,
        source:
          attachment.url ||
          item.document.metadata?.original_filename ||
          item.document.metadata?.id,
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
  const raw = item.document.data_record.raw as
    | (ScanResource & { resource?: ScanResource })
    | undefined;
  return raw?.resource || raw || {};
}
