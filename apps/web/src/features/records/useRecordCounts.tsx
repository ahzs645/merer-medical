import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { debounceTime } from 'rxjs/operators';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ALL_RECORD_CATEGORIES, RecordCategory } from './recordCategories';

export interface RecordCountsValue {
  counts: Map<string, number>;
  status: 'loading' | 'success' | 'error';
}

const RecordCountsContext = createContext<RecordCountsValue | null>(null);

/** Every resource_type any category wants counted, de-duplicated. */
const COUNTED_RESOURCE_TYPES = Array.from(
  new Set(
    ALL_RECORD_CATEGORIES.flatMap((category) => category.resourceTypes ?? []),
  ),
);

/**
 * Computes per-resource-type counts once for the whole Records area and shares
 * them via context, so the side nav and the hub don't each run their own query.
 * Uses count-only queries (no document payloads are materialized) and keeps the
 * numbers live as records are added / removed / synced while Records is mounted.
 */
export function RecordCountsProvider({ children }: { children: ReactNode }) {
  const db = useRxDb();
  const user = useUser();
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );

  useEffect(() => {
    let cancelled = false;

    async function recompute() {
      // RxDB's count() is disallowed in "slow mode" for non-indexed selectors
      // (and would scan anyway), so we do one find over the user's documents
      // and tally by resource_type. We read only the resource_type via .get()
      // rather than materializing each document's full JSON payload. This runs
      // once for the whole Records area (shared via context) and is debounced
      // on changes, instead of the previous per-consumer full re-fetch.
      const docs = await db.clinical_documents
        .find({ selector: { user_id: user.id } })
        .exec();
      if (cancelled) return;
      const tally = new Map<string, number>();
      const wanted = new Set(COUNTED_RESOURCE_TYPES);
      for (const doc of docs) {
        const resourceType = String(
          doc.get('data_record.resource_type') || '',
        ).toLowerCase();
        if (!resourceType || !wanted.has(resourceType)) continue;
        tally.set(resourceType, (tally.get(resourceType) || 0) + 1);
      }
      setCounts(tally);
      setStatus('success');
    }

    recompute().catch(() => {
      if (!cancelled) setStatus('error');
    });

    // Recompute when the collection changes; debounced so a bulk import or sync
    // triggers a single recompute rather than one per inserted row.
    const subscription = db.clinical_documents.$.pipe(
      debounceTime(400),
    ).subscribe(() => {
      recompute().catch(() => {});
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [db, user.id]);

  const value = useMemo<RecordCountsValue>(
    () => ({ counts, status }),
    [counts, status],
  );

  return (
    <RecordCountsContext.Provider value={value}>
      {children}
    </RecordCountsContext.Provider>
  );
}

export function useRecordCounts(): RecordCountsValue {
  return (
    useContext(RecordCountsContext) ?? { counts: new Map(), status: 'loading' }
  );
}

/**
 * Record count for a category, or `undefined` when the category has no
 * resource-type mapping (so callers render nothing instead of a wrong "0").
 */
export function countForCategory(
  category: RecordCategory,
  counts: Map<string, number>,
): number | undefined {
  if (!category.resourceTypes || category.resourceTypes.length === 0) {
    return undefined;
  }
  return category.resourceTypes.reduce(
    (total, resourceType) => total + (counts.get(resourceType) || 0),
    0,
  );
}
