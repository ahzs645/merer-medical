import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';

import {
  handleJSONDataImport,
  useRxDb,
} from '../../../app/providers/RxDbProvider';
import { useNotificationDispatch } from '../../../app/providers/NotificationProvider';
import {
  exportEmrpkgFromRxDb,
  importEmrpkgToRxDb,
  inspectEmrpkg,
} from '../../../services/emrpkg';
import { ButtonLoadingSpinner } from '../../connections/components/ButtonLoadingSpinner';
import { buildAddRecordPath } from '../../manual-entry/addRecordPath';
import { Routes } from '../../../Routes';

function readFileAsBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buf = e.target?.result;
      if (buf instanceof ArrayBuffer) resolve(new Uint8Array(buf));
      else reject(new Error('Unable to read file'));
    };
    reader.onerror = (e) =>
      reject(new Error('File read error: ' + e.target?.error));
    reader.readAsArrayBuffer(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) =>
      reject(new Error('File read error: ' + e.target?.error));
    reader.readAsText(file);
  });
}

function ActionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between rounded-lg border border-gray-200 bg-white p-4">
      <div>
        <div className="text-primary-600 flex items-center gap-2">
          <span className="h-5 w-5">{icon}</span>
          {/* h3: these cards sit directly inside a Sources section, whose
              title is the page's <h2>. As <h4> the outline jumped a level, so
              navigating Sources by heading skipped straight past "Import
              .emrpkg" and its neighbours. */}
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        </div>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

const buttonClass =
  'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 inline-flex w-full items-center justify-center rounded-md border border-transparent px-3 py-2 text-sm font-bold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:bg-gray-400';

const secondaryButtonClass =
  'inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-800 shadow-sm hover:bg-gray-50 disabled:bg-gray-100';

/**
 * Surfaces the app's local data portability features (import/export) as a
 * first-class part of Sources, so the app is useful even when a user's portal
 * is unsupported. Reuses the same emrpkg/JSON service primitives as the Data
 * settings section.
 */
export function ImportRecordsPanel() {
  const db = useRxDb();
  const notifyDispatch = useNotificationDispatch();

  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  const emrpkgImportRef = useRef<HTMLInputElement | null>(null);
  const jsonImportRef = useRef<HTMLInputElement | null>(null);
  const downloadRef = useRef<HTMLAnchorElement | null>(null);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadName, setDownloadName] = useState('');

  const notify = useCallback(
    (message: string, variant: 'success' | 'error' | 'info') =>
      notifyDispatch({ type: 'set_notification', message, variant }),
    [notifyDispatch],
  );

  const handleEmrpkgImport = useCallback(
    async (file: File) => {
      setBusy(true);
      try {
        const bytes = await readFileAsBytes(file);
        const info = await inspectEmrpkg(bytes);
        const needsPassphrase = info.encrypted && info.kdf !== 'webauthn-prf';
        if (needsPassphrase && !passphrase) {
          notify(
            'This package is encrypted. Enter a passphrase first.',
            'error',
          );
          setBusy(false);
          return;
        }
        if (info.kdf === 'webauthn-prf') {
          notify(
            'This package is passkey-protected. Confirm with your passkey.',
            'info',
          );
        }
        const { counts, unknownTables } = await importEmrpkgToRxDb(bytes, db, {
          passphrase: needsPassphrase ? passphrase : undefined,
          replace: importMode === 'replace',
        });
        const total = Object.values(counts).reduce<number>(
          (a, b) => a + (b ?? 0),
          0,
        );
        const extra = unknownTables.length
          ? ` (skipped: ${unknownTables.join(', ')})`
          : '';
        // Merging only adds clinical documents, which every record screen now
        // picks up from the collection itself (RecordChangeBridge). Replacing
        // swaps the whole database, profile and connections included, so that
        // path still restarts the app.
        const replaced = importMode === 'replace';
        notify(
          `Imported ${total} records${extra}.${replaced ? ' Reloading…' : ''}`,
          'success',
        );
        if (replaced) setTimeout(() => window.location.reload(), 1500);
      } catch (e) {
        notify(`Import failed: ${(e as Error).message}`, 'error');
      } finally {
        setBusy(false);
      }
    },
    [db, importMode, notify, passphrase],
  );

  const handleEmrpkgExport = useCallback(async () => {
    setBusy(true);
    try {
      const bytes = await exportEmrpkgFromRxDb(db, {
        passphrase: passphrase || undefined,
      });
      const blob = new Blob([bytes], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      setDownloadUrl(url);
      setDownloadName(`mere_export_${ts}${passphrase ? '.enc' : ''}.emrpkg`);
      setTimeout(() => downloadRef.current?.click(), 0);
      notify(
        `Backup ready (${(bytes.byteLength / 1024 / 1024).toFixed(2)} MB)`,
        'success',
      );
    } catch (e) {
      notify(`Export failed: ${(e as Error).message}`, 'error');
    } finally {
      setBusy(false);
    }
  }, [db, notify, passphrase]);

  const handleJsonImport = useCallback(
    async (file: File) => {
      setBusy(true);
      try {
        const text = await readFileAsText(file);
        const message = await handleJSONDataImport(text, db);
        notify(`${message}. Reloading…`, 'success');
        setTimeout(() => window.location.reload(), 1500);
      } catch (e) {
        notify(`Import failed: ${(e as Error).message}`, 'error');
      } finally {
        setBusy(false);
      }
    },
    [db, notify],
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          type="password"
          aria-label="Passphrase (for encrypted .emrpkg)"
          placeholder="Passphrase (for encrypted .emrpkg)"
          className="focus:ring-primary-500 focus:border-primary-500 block w-64 rounded-md border-gray-300 text-sm shadow-sm"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          autoComplete="new-password"
        />
        <label className="inline-flex items-center text-sm text-gray-700">
          <span className="me-2 font-medium">On import:</span>
          <select
            value={importMode}
            onChange={(e) =>
              setImportMode(e.target.value as 'merge' | 'replace')
            }
            className="focus:ring-primary-500 focus:border-primary-500 rounded-md border-gray-300 text-sm shadow-sm"
          >
            <option value="merge">Add to this app</option>
            <option value="replace">Replace everything</option>
          </select>
        </label>
        {busy ? <ButtonLoadingSpinner /> : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          icon={<ArrowUpTrayIcon />}
          title="Import .emrpkg"
          description="Restore a full record package exported from Mere. Supports passphrase or passkey encryption."
        >
          <button
            type="button"
            disabled={busy}
            className={buttonClass}
            onClick={() => emrpkgImportRef.current?.click()}
          >
            Choose .emrpkg file
          </button>
        </ActionCard>

        <ActionCard
          icon={<ArrowDownTrayIcon />}
          title="Export encrypted backup"
          description="Download all of your records as a single .emrpkg file. Enter a passphrase above to encrypt it."
        >
          <button
            type="button"
            disabled={busy}
            className={secondaryButtonClass}
            onClick={handleEmrpkgExport}
          >
            Export backup
          </button>
        </ActionCard>

        <ActionCard
          icon={<DocumentArrowDownIcon />}
          title="Import old JSON backup"
          description="Import a legacy JSON export from an earlier version of the app."
        >
          <button
            type="button"
            disabled={busy}
            className={secondaryButtonClass}
            onClick={() => jsonImportRef.current?.click()}
          >
            Choose JSON file
          </button>
        </ActionCard>

        {/* This card used to link to a bare `/records/new` and then spend the
            last sentence of its description telling the user to "Choose Device
            on the next screen" — asking them to do by hand what the link had
            been able to carry all along. The preset does it; the sentence is
            gone. `returnTo` keeps them on Sources, where they were importing.

            The card that stood beside it, "Add record manually", was the
            Sources page's own "Add a record" button a section further down,
            with a different label and the same destination. A typed-in record
            is not a file moving in or out of the app, which is all this section
            claims to be about, so the copy of it that lives here is the one
            that went. */}
        <ActionCard
          icon={<ArrowUpTrayIcon />}
          title="Import device file"
          description="Import a FreeStyle Libre export or other device file as readings."
        >
          <Link
            to={buildAddRecordPath({
              type: 'device',
              returnTo: Routes.AddConnection,
            })}
            className={secondaryButtonClass}
          >
            Import device file
          </Link>
        </ActionCard>
      </div>

      <input
        ref={emrpkgImportRef}
        type="file"
        accept=".emrpkg,application/octet-stream,application/zip"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleEmrpkgImport(f);
          e.target.value = '';
        }}
      />
      <input
        ref={jsonImportRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleJsonImport(f);
          e.target.value = '';
        }}
      />
      <a
        ref={downloadRef}
        href={downloadUrl || undefined}
        download={downloadName || undefined}
        className="hidden"
      >
        download
      </a>
    </div>
  );
}
