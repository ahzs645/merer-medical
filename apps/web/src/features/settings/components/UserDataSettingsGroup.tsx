import {
  handleJSONDataImport,
  useRxDb,
} from '../../../app/providers/RxDbProvider';
import { DatabaseCollections } from '../../../app/providers/DatabaseCollections';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNotificationDispatch } from '../../../app/providers/NotificationProvider';
import { SubmitHandler, useForm } from 'react-hook-form';
import { ButtonLoadingSpinner } from '../../connections/components/ButtonLoadingSpinner';
import { getFileFromFileList } from '../../../shared/utils/FileUtils';
import { RxDatabase } from 'rxdb';
import {
  checkIfPersistentStorageAvailable,
  checkIfPersistentStorageEnabled,
  getStorageQuota,
  requestPersistentStorage,
} from '../../../shared/utils/storagePermissionUtils';
import {
  exportEmrpkgFromRxDb,
  importEmrpkgToRxDb,
  inspectEmrpkg,
} from '../../../services/emrpkg';
import React from 'react';

export type ImportFields = {
  backup?: FileList;
};

export const exportData = (
  db: RxDatabase<DatabaseCollections>,
  setFileDownloadLink: (blob: string) => void,
) => {
  return db.exportJSON().then((json) => {
    console.debug('UserDataSettingsGroup: Exporting data:', json);
    const jsonData = JSON.stringify(json);
    const blobUrl = URL.createObjectURL(
      new Blob([jsonData], { type: 'application/json' }),
    );
    setFileDownloadLink(blobUrl);
    return blobUrl;
  });
};

export const handleImport = (
  fields: ImportFields,
  db: RxDatabase<DatabaseCollections>,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const file = getFileFromFileList(fields.backup);
    if (file && file instanceof File) {
      const reader = new FileReader();
      reader.onload = function (event) {
        const jsonData = event.target?.result as string;
        if (jsonData) {
          handleJSONDataImport(jsonData, db)
            .then((result) => {
              resolve(result);
            })
            .catch((error) => {
              reject(error);
            });
        } else {
          reject(Error('The file was empty or unable to be read'));
        }
      };
      reader.onerror = function (error) {
        reject(
          Error('There was an error importing your data' + error.target?.error),
        );
      };
      reader.readAsText(file);
    } else {
      reject(
        Error(
          'There was an error importing your data: Unable to parse file from file list',
        ),
      );
    }
  });
};

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

export function UserDataSettingsGroup() {
  const db = useRxDb(),
    [fileDownloadLink, setFileDownloadLink] = useState(''),
    notifyDispatch = useNotificationDispatch(),
    [backupInProgress, setBackupInProgress] = useState(false),
    [quotaDetails, setQuotaDetails] = useState({} as StorageEstimate),
    [hasPersistentStorageEnabled, setHasPersistentStorageEnabled] =
      useState(false);

  const clickDownloadRef = useRef<HTMLAnchorElement | null>(null);

  // ─── .emrpkg state ─────────────────────────────────────────────────────────
  const [emrpkgPassphrase, setEmrpkgPassphrase] = useState('');
  const [emrpkgEncrypt, setEmrpkgEncrypt] = useState(false);
  const [emrpkgDownloadUrl, setEmrpkgDownloadUrl] = useState('');
  const [emrpkgDownloadName, setEmrpkgDownloadName] = useState('');
  const [emrpkgBusy, setEmrpkgBusy] = useState(false);
  const emrpkgDownloadRef = useRef<HTMLAnchorElement | null>(null);
  const emrpkgImportRef = useRef<HTMLInputElement | null>(null);

  const handleEmrpkgExport = useCallback(async () => {
    if (emrpkgEncrypt && !emrpkgPassphrase) {
      notifyDispatch({
        type: 'set_notification',
        message: 'Enter a passphrase or uncheck encryption.',
        variant: 'error',
      });
      return;
    }
    setEmrpkgBusy(true);
    try {
      const bytes = await exportEmrpkgFromRxDb(db, {
        passphrase: emrpkgEncrypt ? emrpkgPassphrase : undefined,
      });
      const blob = new Blob([bytes], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const name = `mere_export_${ts}${emrpkgEncrypt ? '.enc' : ''}.emrpkg`;
      setEmrpkgDownloadUrl(url);
      setEmrpkgDownloadName(name);
      // schedule click after state has flushed
      setTimeout(() => emrpkgDownloadRef.current?.click(), 0);
      notifyDispatch({
        type: 'set_notification',
        message: `Export ready (${(bytes.byteLength / 1024 / 1024).toFixed(2)} MB)`,
        variant: 'success',
      });
    } catch (e) {
      notifyDispatch({
        type: 'set_notification',
        message: `Export failed: ${(e as Error).message}`,
        variant: 'error',
      });
    } finally {
      setEmrpkgBusy(false);
    }
  }, [db, emrpkgEncrypt, emrpkgPassphrase, notifyDispatch]);

  const handleEmrpkgImport = useCallback(
    async (file: File) => {
      setEmrpkgBusy(true);
      try {
        const bytes = await readFileAsBytes(file);
        const info = await inspectEmrpkg(bytes);
        if (info.encrypted && !emrpkgPassphrase) {
          notifyDispatch({
            type: 'set_notification',
            message: 'This package is encrypted. Enter a passphrase first.',
            variant: 'error',
          });
          setEmrpkgBusy(false);
          return;
        }
        const { counts, unknownTables } = await importEmrpkgToRxDb(bytes, db, {
          passphrase: info.encrypted ? emrpkgPassphrase : undefined,
          replace: true,
        });
        const total = Object.values(counts).reduce<number>(
          (a, b) => a + (b ?? 0),
          0,
        );
        const extra = unknownTables.length
          ? ` (skipped: ${unknownTables.join(', ')})`
          : '';
        notifyDispatch({
          type: 'set_notification',
          message: `Imported ${total} records${extra}. Reloading…`,
          variant: 'success',
        });
        setTimeout(() => window.location.reload(), 1500);
      } catch (e) {
        notifyDispatch({
          type: 'set_notification',
          message: `Import failed: ${(e as Error).message}`,
          variant: 'error',
        });
      } finally {
        setEmrpkgBusy(false);
      }
    },
    [db, emrpkgPassphrase, notifyDispatch],
  );

  const importData: SubmitHandler<ImportFields> = useCallback(
    async (fields) => {
      setBackupInProgress(true);
      try {
        const message = await handleImport(fields, db);
        setBackupInProgress(false);
        notifyDispatch({
          type: 'set_notification',
          message: `${message}, this webpage will be reloaded automatically`,
          variant: 'success',
        });
        setTimeout(() => window.location.reload(), 2000);
      } catch (e) {
        setBackupInProgress(false);
        notifyDispatch({
          type: 'set_notification',
          message: (e as Error).message,
          variant: 'error',
        });
      }
    },
    [db, notifyDispatch],
  );

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: { backup: undefined },
  });
  const backupFile = watch('backup');
  const formref = useRef<HTMLFormElement>(null);

  const file = getFileFromFileList(backupFile);
  const importButtonText = !file
    ? 'Select backup file'
    : file instanceof File
      ? file.name
      : 'File selected';

  useEffect(() => {
    if (backupFile) {
      formref.current?.dispatchEvent(new Event('submit', { cancelable: true }));
    }
  }, [backupFile]);

  useEffect(() => {
    if (checkIfPersistentStorageAvailable()) {
      getStorageQuota().then((quota) => {
        setQuotaDetails(quota);
      });

      checkIfPersistentStorageEnabled().then((result) => {
        setHasPersistentStorageEnabled(result);
      });
    }
  }, []);

  return (
    <>
      <h1 className="py-6 text-xl font-extrabold">Data</h1>
      <div className="divide-y divide-gray-200">
        <div className="px-4 sm:px-6">
          <ul className="mt-2 divide-y divide-gray-200">
            <li className="flex items-center pb-4">
              <div className="flex flex-1 flex-col">
                <h2 className="text-primary-800 text-lg leading-6">
                  Export data
                </h2>
                <p className="pt-2 text-sm text-gray-800">
                  Export all of your data in JSON format. You can use this to
                  backup your data and can import it back if needed.
                </p>
              </div>
              {!fileDownloadLink ? (
                <button
                  type="button"
                  className="bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 relative ml-4 inline-flex flex-shrink-0 cursor-pointer items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
                  onClick={() => {
                    exportData(db, setFileDownloadLink).then((link) => {
                      if (link) {
                        clickDownloadRef.current?.click();
                      }
                    });
                  }}
                >
                  <p className="font-bold">Start Export</p>
                </button>
              ) : (
                <a
                  type="button"
                  className="bg-green-600 hover:bg-green-700 focus:ring-green-500 relative ml-4 inline-flex flex-shrink-0 cursor-pointer items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
                  ref={clickDownloadRef}
                  target="_blank"
                  rel="noreferrer"
                  id="downloadLink"
                  download={`mere_export_${new Date().toISOString()}.json`}
                  href={fileDownloadLink}
                >
                  Download
                </a>
              )}
            </li>
            <li className="flex items-center py-4">
              <div className="flex flex-1 flex-col">
                <h2 className="text-primary-800 text-lg leading-6">
                  Import data
                </h2>
                <p className="pt-2 text-sm text-gray-800">
                  Import previously exported data
                </p>
              </div>
              <form
                ref={formref}
                onSubmit={handleSubmit(importData)}
                className="border-0"
              >
                <label className="bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 relative ml-4 inline-flex flex-shrink-0 cursor-pointer items-center rounded-md border border-transparent px-4 py-2 text-sm font-bold  text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2">
                  {importButtonText}
                  <input
                    type="file"
                    id="profilePhoto"
                    accept="application/json"
                    className="hidden"
                    {...register('backup', {
                      required: true,
                      validate: (value, formValues) => value !== undefined,
                    })}
                    aria-invalid={errors.backup ? 'true' : 'false'}
                  />
                  {errors.backup && (
                    <p className="text-red-500">{`${errors.backup?.message}`}</p>
                  )}
                </label>
                {file !== undefined && (
                  <button
                    type="submit"
                    disabled={backupInProgress}
                    className="relative ml-4 inline-flex flex-shrink-0 cursor-pointer items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-sm  hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:bg-gray-700"
                  >
                    {backupInProgress ? (
                      <>
                        <p className="pr-2">{'Importing'}</p>
                        <ButtonLoadingSpinner />
                      </>
                    ) : (
                      'Start Import'
                    )}
                  </button>
                )}
              </form>
            </li>
            {/* ── .emrpkg package import/export ──────────────────────────── */}
            <li className="flex flex-col py-4">
              <div className="flex flex-col">
                <h2 className="text-primary-800 text-lg leading-6">
                  Encrypted package (.emrpkg)
                </h2>
                <p className="pt-2 text-sm text-gray-800">
                  Export and import your data as a single{' '}
                  <code className="text-xs">.emrpkg</code> file. Optionally
                  protect the file with a passphrase (AES-GCM, PBKDF2-SHA256,
                  600,000 iterations). Use this to move your records between
                  browsers or devices.
                </p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center text-sm text-gray-800">
                  <input
                    type="checkbox"
                    className="text-primary-600 focus:ring-primary-500 mr-2 h-4 w-4 rounded border-gray-300"
                    checked={emrpkgEncrypt}
                    onChange={(e) => setEmrpkgEncrypt(e.target.checked)}
                  />
                  Encrypt
                </label>
                <input
                  type="password"
                  placeholder="Passphrase"
                  className="focus:ring-primary-500 focus:border-primary-500 block w-56 rounded-md border-gray-300 text-sm shadow-sm"
                  value={emrpkgPassphrase}
                  onChange={(e) => setEmrpkgPassphrase(e.target.value)}
                  disabled={!emrpkgEncrypt}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  disabled={emrpkgBusy}
                  onClick={handleEmrpkgExport}
                  className="bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 inline-flex items-center rounded-md border border-transparent px-4 py-2 text-sm font-bold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:bg-gray-500"
                >
                  {emrpkgBusy ? (
                    <>
                      <span className="pr-2">Working</span>
                      <ButtonLoadingSpinner />
                    </>
                  ) : (
                    'Export .emrpkg'
                  )}
                </button>
                <button
                  type="button"
                  disabled={emrpkgBusy}
                  onClick={() => emrpkgImportRef.current?.click()}
                  className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 disabled:bg-gray-500"
                >
                  Import .emrpkg
                </button>
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
                <a
                  ref={emrpkgDownloadRef}
                  href={emrpkgDownloadUrl || undefined}
                  download={emrpkgDownloadName || undefined}
                  className="hidden"
                >
                  download
                </a>
              </div>
            </li>
            {/* Show storage usage  */}
            <li className="flex items-center py-4">
              <div className="mr-2 flex flex-1 flex-col sm:mr-4">
                <h2 className="text-primary-800 text-lg leading-6">
                  Storage usage
                </h2>
                {/* show if persistant storage is enabled */}
                <p className="pt-2 text-sm text-gray-800">
                  {hasPersistentStorageEnabled
                    ? 'Persistent storage is enabled.'
                    : 'Persistent storage is not enabled - data may be cleared by the browser.'}
                </p>
                {/* Progress bar */}
                {quotaDetails.usage && quotaDetails.quota && (
                  <div className="mt-2 h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-300">
                    <div
                      className="bg-primary-500 h-2.5 min-w-[0.625rem] rounded-full"
                      style={{
                        width: `${
                          (quotaDetails.usage / quotaDetails.quota) * 100
                        }%`,
                      }}
                    ></div>
                  </div>
                )}
                <p className="pt-1 text-sm text-gray-800">
                  {quotaDetails.usage && quotaDetails.quota
                    ? `You have used ${
                        quotaDetails.usage >= 1024 * 1024 * 1024
                          ? `${(
                              quotaDetails.usage /
                              1024 /
                              1024 /
                              1024
                            ).toFixed(2)} GB`
                          : `${(quotaDetails.usage / 1024 / 1024).toFixed(
                              2,
                            )} MB`
                      } out of ${
                        quotaDetails.quota >= 1024 * 1024 * 1024
                          ? `${(
                              quotaDetails.quota /
                              1024 /
                              1024 /
                              1024
                            ).toFixed(2)} GB`
                          : `${(quotaDetails.quota / 1024 / 1024).toFixed(
                              2,
                            )} MB`
                      } of total storage available.`
                    : 'Storage quota not available.'}
                </p>
              </div>
              <div>
                {checkIfPersistentStorageAvailable() &&
                  !hasPersistentStorageEnabled && (
                    <button
                      onClick={() => {
                        requestPersistentStorage().then((result) => {
                          if (result) {
                            notifyDispatch({
                              type: 'set_notification',
                              message: `Persistent storage is enabled.`,
                              variant: 'success',
                            });
                          } else {
                            notifyDispatch({
                              type: 'set_notification',
                              message: `Persistent storage cannot be enabled. Try installing Mere as a PWA to enable persistant storage.`,
                              variant: 'error',
                            });
                          }
                          setHasPersistentStorageEnabled(result);
                        });
                      }}
                      className="bg-primary-600 hover:bg-primary-700 focus:ring-primary-500 relative mt-2 inline-flex flex-shrink-0 cursor-pointer items-center rounded-md border border-transparent px-4 py-2 text-sm font-bold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
                    >
                      Enable
                    </button>
                  )}
              </div>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
