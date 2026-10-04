import { Dialog } from '@headlessui/react';
import { useEffect, useRef, useState } from 'react';

import {
  useLocalConfig,
  useUpdateLocalConfig,
} from '../../../app/providers/LocalConfigProvider';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { useCloseOnBack } from '../../../shared/hooks/useCloseOnBack';
import {
  getFileSetAsFiles,
  hasDicomSignature,
  hasExtension,
  relativePathOf,
  type FileSetSummary,
} from '../../../shared/storage/fileStore';
import { downloadFileSet } from '../../../shared/storage/fileSetZip';

export const DEFAULT_CBCT_VIEWER_URL = 'https://ahzs645.github.io/CBCTer/';

/** The handoff protocol CBCTer speaks; see its src/app/sources/embeddedHandoff.ts. */
const READY = 'cbcter:ready';
const FOLDER = 'cbcter:scan-folder';
const PROTOCOL = 1;
/** How long to wait for the viewer to say it is ready before offering the zip. */
const READY_TIMEOUT_MS = 20_000;

type Phase = 'loading' | 'waiting' | 'sent' | 'no-answer' | 'error';

/**
 * What the viewer is sent for each file. CBCTer picks a DICOM folder by the
 * `.dcm` extension, and many exports have none (IM000001), so an
 * extensionless file that carries the DICOM signature is sent with `.dcm`
 * added. The stored file is unchanged; other extensionless files (GALILEOS
 * volume slices) keep their names.
 */
export async function viewerEntries(files: File[]) {
  return Promise.all(
    files.map(async (file) => {
      const path = relativePathOf(file);
      const suffix =
        !hasExtension(file.name) && (await hasDicomSignature(file))
          ? '.dcm'
          : '';
      return {
        name: `${file.name}${suffix}`,
        relativePath: `${path}${suffix}`,
        file,
      };
    }),
  );
}

/** A DICOM set, or any folder of several files (GALILEOS, OneVolume). */
export function canOpenInViewer(set: Pick<FileSetSummary, 'kind' | 'count'>) {
  return set.kind === 'dicom' || (set.kind === 'files' && set.count > 1);
}

/** The viewer page, asked to wait for a folder from us. */
export function handoffUrl(viewerUrl: string): string {
  const url = new URL(viewerUrl);
  url.searchParams.set('handoff', 'postmessage');
  return url.toString();
}

/**
 * A CBCT, opened in CBCTer inside this page. The viewer is embedded rather
 * than opened in a new tab because it is served with
 * Cross-Origin-Opener-Policy: same-origin, which cuts a popup off from the
 * page that opened it. The DICOM files go to the frame by postMessage, to the
 * viewer's origin only; nothing is uploaded — the viewer is a static page
 * that reads them in this browser.
 */
export function CbctViewerDialog({
  fileSet,
  onClose,
}: {
  fileSet: FileSetSummary;
  onClose: () => void;
}) {
  const { t } = useInterfaceLanguage();
  const config = useLocalConfig();
  const updateConfig = useUpdateLocalConfig();
  const viewerUrl = config.cbct_viewer_url || DEFAULT_CBCT_VIEWER_URL;
  const viewerOrigin = new URL(viewerUrl).origin;
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [files, setFiles] = useState<Awaited<
    ReturnType<typeof viewerEntries>
  > | null>(null);
  const [editingUrl, setEditingUrl] = useState(false);
  const [draftUrl, setDraftUrl] = useState(viewerUrl);
  useCloseOnBack(true, onClose);

  useEffect(() => {
    let cancelled = false;
    getFileSetAsFiles(fileSet.id)
      .then((loaded) => {
        if (cancelled) return;
        if (loaded.length === 0) {
          setPhase('error');
          return;
        }
        return viewerEntries(loaded).then((entries) => {
          if (cancelled) return;
          setFiles(entries);
          setPhase('waiting');
        });
      })
      .catch(() => !cancelled && setPhase('error'));
    return () => {
      cancelled = true;
    };
  }, [fileSet.id]);

  useEffect(() => {
    if (!files) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== viewerOrigin) return;
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type !== READY || event.data?.protocol !== PROTOCOL)
        return;
      frameRef.current?.contentWindow?.postMessage(
        {
          type: FOLDER,
          protocol: PROTOCOL,
          label: fileSet.label,
          entries: files,
        },
        viewerOrigin,
      );
      setPhase('sent');
    };
    window.addEventListener('message', onMessage);
    const timer = window.setTimeout(
      () =>
        setPhase((current) => (current === 'waiting' ? 'no-answer' : current)),
      READY_TIMEOUT_MS,
    );
    return () => {
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timer);
    };
  }, [files, fileSet.label, viewerOrigin]);

  const status =
    phase === 'loading'
      ? t('Getting the scan ready…')
      : phase === 'waiting'
        ? t('Opening the viewer…')
        : phase === 'sent'
          ? t(
              'Scan sent to the viewer. It runs in this browser; nothing is uploaded.',
            )
          : phase === 'no-answer'
            ? t(
                'The viewer did not answer. Download the scan and open it in the viewer yourself, or check the viewer address.',
              )
            : t('The scan files could not be found on this device.');

  return (
    <Dialog open onClose={onClose} className="relative z-dialog">
      <div className="fixed inset-0 bg-gray-900/60" aria-hidden="true" />
      <div className="fixed inset-0 flex flex-col p-0 sm:p-6">
        <Dialog.Panel className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white sm:rounded-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-4 py-2">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-base font-semibold text-gray-900">
                {fileSet.label}
              </Dialog.Title>
              <p className="text-xs text-gray-600" role="status">
                {status}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void downloadFileSet(fileSet)}
                className="inline-flex min-h-[44px] items-center rounded-md px-3 text-sm font-medium text-primary-700 hover:bg-gray-100"
              >
                {t('Download (.zip)')}
              </button>
              <button
                type="button"
                onClick={() => setEditingUrl((value) => !value)}
                className="inline-flex min-h-[44px] items-center rounded-md px-3 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                {t('Viewer address')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex min-h-[44px] items-center rounded-md bg-primary-800 px-3 text-sm font-semibold text-white hover:bg-primary-700"
              >
                {t('Close')}
              </button>
            </div>
          </div>
          {editingUrl && (
            <form
              className="flex flex-wrap items-end gap-2 border-b border-gray-200 px-4 py-2"
              onSubmit={(event) => {
                event.preventDefault();
                try {
                  new URL(draftUrl);
                  updateConfig({ cbct_viewer_url: draftUrl.trim() });
                  setEditingUrl(false);
                  setPhase(files ? 'waiting' : 'loading');
                } catch {
                  /* keep editing */
                }
              }}
            >
              <label className="min-w-0 flex-1 text-xs font-medium text-gray-700">
                {t('Where CBCTer is served (self-hosted copies work too)')}
                <input
                  type="url"
                  value={draftUrl}
                  onChange={(event) => setDraftUrl(event.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900"
                />
              </label>
              <button
                type="submit"
                className="min-h-[44px] rounded-md bg-primary-800 px-3 text-sm font-semibold text-white"
              >
                {t('Save')}
              </button>
            </form>
          )}
          {files && phase !== 'error' && (
            <iframe
              key={viewerUrl}
              ref={frameRef}
              title={t('CBCT viewer')}
              src={handoffUrl(viewerUrl)}
              className="min-h-0 w-full flex-1 border-0"
              allow="cross-origin-isolated; fullscreen"
            />
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
