import React, { useCallback, useRef, useState } from 'react';
import { TutorialAction } from '../TutorialOverlay';
import { TutorialContentScreen } from './TutorialContentScreen';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { useRxDb } from '../../../app/providers/RxDbProvider';
import { useNotificationDispatch } from '../../../app/providers/NotificationProvider';
import { importEmrpkgToRxDb, inspectEmrpkg } from '../../../services/emrpkg';

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

export function TutorialCompleteScreen({
  dispatch,
}: {
  dispatch: React.Dispatch<TutorialAction>;
}) {
  const { t } = useInterfaceLanguage();
  const db = useRxDb();
  const notifyDispatch = useNotificationDispatch();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = useCallback(
    async (file: File) => {
      setIsImporting(true);
      try {
        const bytes = await readFileAsBytes(file);
        const info = await inspectEmrpkg(bytes);
        if (info.encrypted) {
          notifyDispatch({
            type: 'set_notification',
            message:
              'This package is encrypted. Use Settings > Data to import it with a passphrase or passkey.',
            variant: 'error',
          });
          return;
        }
        const { counts, unknownTables } = await importEmrpkgToRxDb(bytes, db, {
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
          message: `Imported ${total} records${extra}. Reloading...`,
          variant: 'success',
        });
        dispatch({ type: 'complete_tutorial' });
        setTimeout(() => window.location.reload(), 1500);
      } catch (e) {
        notifyDispatch({
          type: 'set_notification',
          message: `Import failed: ${(e as Error).message}`,
          variant: 'error',
        });
      } finally {
        setIsImporting(false);
        if (importInputRef.current) {
          importInputRef.current.value = '';
        }
      }
    },
    [db, dispatch, notifyDispatch],
  );

  return (
    <TutorialContentScreen
      dispatch={dispatch}
      isLastScreen
      primaryAction={() => dispatch({ type: 'complete_tutorial' })}
      primaryActionLabel={t('Start fresh')}
      primaryActionDisabled={isImporting}
    >
      <h1 className="mb-4 text-center text-xl font-semibold">
        {t("You're all set!")}
      </h1>
      <div className="mx-auto self-center justify-self-center rounded-lg p-2 align-middle sm:max-w-lg">
        <p className="mb-2">
          {t('Enjoy using Mere to manage your health records!')}
        </p>
        <p className="mb-2">
          {t(
            'Mere is still in early beta, so if you have any feedback or suggestions, please send us an email at',
          )}{' '}
          <a
            href="mailto:cfu288@meremedical.co"
            className="text-primary-100 hover:text-primary-50 inline underline"
          >
            cfu288@meremedical.co
          </a>{' '}
          {t('to let us know.')}
        </p>
        <div className="mt-6 flex flex-col items-center gap-2 border-t border-white/30 pt-4 text-center">
          <p className="text-sm">
            {t('Already have a Mere profile? Import your .emrpkg file.')}
          </p>
          <button
            className="bg-primary-500 hover:bg-primary-600 disabled:bg-primary-400 rounded py-2 px-4 font-bold text-white disabled:cursor-not-allowed"
            disabled={isImporting}
            onClick={() => importInputRef.current?.click()}
          >
            {isImporting ? t('Importing...') : t('Import existing .emrpkg')}
          </button>
          <input
            ref={importInputRef}
            type="file"
            className="hidden"
            accept=".emrpkg,application/octet-stream,application/zip"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void handleImport(file);
              }
            }}
          />
        </div>
      </div>
    </TutorialContentScreen>
  );
}
