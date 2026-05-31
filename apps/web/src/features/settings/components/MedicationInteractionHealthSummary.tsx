import type { RxNormCacheStatus } from '../../medications/interactions/rxnormCacheStore';
import type { MedicationInteractionBundleStatus } from '../../medications/interactions/types';

export function MedicationInteractionHealthSummary({
  bundleStatus,
  rxNormCacheStatus,
}: {
  bundleStatus?: MedicationInteractionBundleStatus;
  rxNormCacheStatus?: RxNormCacheStatus;
}) {
  return (
    <div className="grid gap-3">
      <div className="rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-600">
        <div className="font-semibold text-gray-900">DDInter bundle status</div>
        <div className="mt-1">
          {bundleStatus?.installed
            ? `${bundleStatus.readiness}: ${bundleStatus.recordCount.toLocaleString()} indexed records from ${
                bundleStatus.fileCount || 0
              } files.`
            : 'Missing: load the bundled DDInter data before checking interactions.'}
        </div>
        {bundleStatus?.updatedAt && (
          <div className="mt-1">Last loaded: {bundleStatus.updatedAt}</div>
        )}
        <div className="mt-1">
          Source:{' '}
          {bundleStatus?.sourceUrl || 'https://ddinter.scbdd.com/download/'}
        </div>
        <div className="mt-1">
          License: {bundleStatus?.license || 'DDInter source terms apply'}
        </div>
      </div>
      <div className="rounded-md border border-gray-200 bg-white p-3 text-xs text-gray-600">
        <div className="font-semibold text-gray-900">RxNorm cache status</div>
        <div className="mt-1">
          {rxNormCacheStatus
            ? `${rxNormCacheStatus.entryCount.toLocaleString()} cached lookups; ${rxNormCacheStatus.staleEntryCount.toLocaleString()} stale.`
            : 'Cache status unavailable.'}
        </div>
        {rxNormCacheStatus?.lastUpdatedAt && (
          <div className="mt-1">
            Last updated: {rxNormCacheStatus.lastUpdatedAt}
          </div>
        )}
        <div className="mt-1">
          RxNorm lookups use RxNav when online and fall back to cached or local
          medication terms when unavailable.
        </div>
      </div>
    </div>
  );
}
