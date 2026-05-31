import { useEffect, useState } from 'react';

import {
  useLocalConfig,
  useUpdateLocalConfig,
} from '../../../app/providers/LocalConfigProvider';
import { useNotificationDispatch } from '../../../app/providers/NotificationProvider';
import { useRxDb } from '../../../app/providers/RxDbProvider';
import { useUser } from '../../../app/providers/UserProvider';
import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import {
  clearDdinterBundle,
  getDdinterStatus,
  importDdinterCsvFiles,
  syncDdinterBundleFromRemote,
} from '../../medications/interactions/ddinterStore';
import { normalizeMedicationsWithRxNorm } from '../../medications/interactions/rxnormNormalizer';
import {
  clearRxNormCache,
  getRxNormCacheStatus,
  type RxNormCacheStatus,
} from '../../medications/interactions/rxnormCacheStore';
import type { MedicationInteractionBundleStatus } from '../../medications/interactions/types';
import { MEDICATION_RESOURCE_TYPES } from '../../medications/hooks/useMedicationsData';
import { normalizeMedicationDocuments } from '../../medications/medicationNormalizer';
import { toMedicationViewItem } from '../../medications/medicationViewModel';
import { MedicationInteractionHealthSummary } from './MedicationInteractionHealthSummary';

export function MedicationInteractionSettingsGroup() {
  const localConfig = useLocalConfig();
  const updateLocalConfig = useUpdateLocalConfig();
  const notifyDispatch = useNotificationDispatch();
  const db = useRxDb();
  const user = useUser();
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshingRxNorm, setIsRefreshingRxNorm] = useState(false);
  const [bundleStatus, setBundleStatus] =
    useState<MedicationInteractionBundleStatus>();
  const [rxNormCacheStatus, setRxNormCacheStatus] =
    useState<RxNormCacheStatus>();

  async function refreshStatus() {
    const [nextBundleStatus, nextRxNormStatus] = await Promise.all([
      getDdinterStatus(),
      getRxNormCacheStatus(),
    ]);
    setBundleStatus(nextBundleStatus);
    setRxNormCacheStatus(nextRxNormStatus);
  }

  async function fetchCurrentMedicationItems() {
    const docs = await db.clinical_documents
      .find({
        selector: {
          user_id: user.id,
          'data_record.resource_type': { $in: MEDICATION_RESOURCE_TYPES },
        },
        sort: [{ 'metadata.date': 'desc' }],
      })
      .exec();

    return normalizeMedicationDocuments(
      docs.map((doc) => doc.toMutableJSON() as ClinicalDocument),
    ).map(toMedicationViewItem);
  }

  useEffect(() => {
    refreshStatus();
  }, []);

  return (
    <>
      <div className="py-6 text-xl font-extrabold">
        Medication safety plugins
      </div>
      <div className="grid gap-4 rounded border border-gray-200 bg-gray-50 p-4 text-sm">
        <label className="flex items-start gap-3 font-medium text-gray-800">
          <input
            type="checkbox"
            checked={!!localConfig.medication_interactions_enabled}
            onChange={(event) =>
              updateLocalConfig({
                medication_interactions_enabled: event.target.checked,
                medication_interactions_provider: 'ddinter',
              })
            }
            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
          />
          <span>
            <span className="block font-semibold text-gray-900">
              Enable DDInter interaction checks
            </span>
            <span className="mt-1 block text-gray-600">
              Uses the bundled DDInter CSV files for drug-drug interaction
              review and stores an imported copy in the browser database.
              Bundled size is ~13.1 MB. Results are informational and absence
              from DDInter is not a safety guarantee.
            </span>
          </span>
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isSyncing}
            className="rounded-md border border-primary-200 bg-white px-3 py-1.5 text-sm font-semibold text-primary-700 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={async () => {
              setIsSyncing(true);
              try {
                const count = await syncDdinterBundleFromRemote();
                notifyDispatch({
                  type: 'set_notification',
                  message: `Synced ${count} DDInter interaction records.`,
                  variant: 'success',
                });
                await refreshStatus();
              } catch (error) {
                notifyDispatch({
                  type: 'set_notification',
                  message: `DDInter sync failed: ${
                    (error as Error).message
                  }. Try manual CSV import instead.`,
                  variant: 'error',
                });
              } finally {
                setIsSyncing(false);
              }
            }}
          >
            {isSyncing ? 'Syncing...' : 'Load bundled DDInter data'}
          </button>
          <label className="inline-flex cursor-pointer items-center rounded-md border border-primary-200 px-3 py-1.5 text-sm font-semibold text-primary-700 hover:bg-primary-50">
            {isImporting ? 'Importing...' : 'Import DDInter CSV bundle'}
            <input
              type="file"
              accept=".csv,text/csv"
              multiple
              disabled={isImporting}
              className="sr-only"
              onChange={async (event) => {
                const files = Array.from(event.target.files ?? []);
                if (files.length === 0) return;
                setIsImporting(true);
                try {
                  const count = await importDdinterCsvFiles(files);
                  notifyDispatch({
                    type: 'set_notification',
                    message: `Imported ${count} DDInter interaction records.`,
                    variant: 'success',
                  });
                  await refreshStatus();
                } catch (error) {
                  notifyDispatch({
                    type: 'set_notification',
                    message: `DDInter import failed: ${(error as Error).message}`,
                    variant: 'error',
                  });
                } finally {
                  setIsImporting(false);
                  event.target.value = '';
                }
              }}
            />
          </label>
          <button
            type="button"
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            onClick={async () => {
              await clearDdinterBundle();
              notifyDispatch({
                type: 'set_notification',
                message: 'DDInter bundle removed.',
                variant: 'success',
              });
              await refreshStatus();
            }}
          >
            Remove DDInter bundle
          </button>
          <button
            type="button"
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            onClick={async () => {
              const status = await getDdinterStatus();
              setBundleStatus(status);
              notifyDispatch({
                type: 'set_notification',
                message: status.installed
                  ? `DDInter bundle ${status.readiness}: ${status.recordCount} records.`
                  : 'DDInter bundle missing.',
                variant: status.readiness === 'stale' ? 'info' : 'success',
              });
            }}
          >
            Check plugin status
          </button>
          <button
            type="button"
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            onClick={async () => {
              await clearRxNormCache();
              await refreshStatus();
              notifyDispatch({
                type: 'set_notification',
                message: 'RxNorm cache cleared.',
                variant: 'success',
              });
            }}
          >
            Clear RxNorm cache
          </button>
          <button
            type="button"
            disabled={isRefreshingRxNorm}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={async () => {
              setIsRefreshingRxNorm(true);
              try {
                const items = await fetchCurrentMedicationItems();
                const results = await normalizeMedicationsWithRxNorm(items, {
                  forceRefreshStale: true,
                });
                const skippedFresh = results.filter(
                  (result) =>
                    result.provenance.cacheHit && !result.provenance.cacheStale,
                ).length;
                const failed = results.filter(
                  (result) =>
                    !result.provenance.cacheHit &&
                    result.provenance.strategy === 'local-only',
                ).length;
                const refreshed = results.length - skippedFresh - failed;
                await refreshStatus();
                notifyDispatch({
                  type: 'set_notification',
                  message: `RxNorm cache refresh complete: ${refreshed} refreshed, ${skippedFresh} skipped, ${failed} failed.`,
                  variant: 'success',
                });
              } catch (error) {
                notifyDispatch({
                  type: 'set_notification',
                  message: `RxNorm refresh failed: ${(error as Error).message}`,
                  variant: 'error',
                });
              } finally {
                setIsRefreshingRxNorm(false);
              }
            }}
          >
            {isRefreshingRxNorm
              ? 'Refreshing...'
              : 'Refresh stale RxNorm cache'}
          </button>
        </div>
        <MedicationInteractionHealthSummary
          bundleStatus={bundleStatus}
          rxNormCacheStatus={rxNormCacheStatus}
        />
      </div>
    </>
  );
}
