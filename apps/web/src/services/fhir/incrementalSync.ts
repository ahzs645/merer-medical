/**
 * Helpers for incremental sync (issue #51): instead of re-fetching every
 * record on each sync, ask the FHIR server only for resources updated since
 * the last successful sync via the `_lastUpdated` search parameter.
 *
 * FHIR servers treat unknown/unsupported search parameters leniently by
 * default (they ignore them), so a server that does not support
 * `_lastUpdated` simply falls back to a full sync. Upserts de-duplicate, so
 * correctness is preserved either way.
 */

// Re-fetch a day of overlap so records updated mid-sync are never skipped.
const OVERLAP_MS = 24 * 60 * 60 * 1000;

type IncrementalConnection = {
  last_refreshed?: string;
  last_sync_was_error?: boolean;
};

/**
 * Returns the `_lastUpdated` search parameter for an incremental sync, or an
 * empty object when a full sync should be performed (first sync, unparseable
 * timestamp, or after a previous error).
 */
export function incrementalSearchParams(
  connectionDocument: IncrementalConnection,
): Record<string, string> {
  const lastRefreshed = connectionDocument.last_refreshed;
  if (!lastRefreshed) return {};
  // After an error, do a full sync to backfill anything that may have been missed.
  if (connectionDocument.last_sync_was_error) return {};
  const timestamp = Date.parse(lastRefreshed);
  if (Number.isNaN(timestamp)) return {};
  const since = new Date(timestamp - OVERLAP_MS).toISOString();
  return { _lastUpdated: `gt${since}` };
}
