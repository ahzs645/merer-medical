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
import { isAllergyNegation } from '../../shared/utils/allergyNegation';
import { firstText } from '../../shared/utils/fhirText';
import { ALL_RECORD_CATEGORIES, RecordCategory } from './recordCategories';

export interface RecordCountsValue {
  counts: Map<string, number>;
  /** Most recent `metadata.date` seen per resource_type, as an ISO string. */
  latest: Map<string, string>;
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
 * Tallies with a single find() (reading only resource_type via .get(), not each
 * document's full JSON) and keeps the numbers live as records are added /
 * removed / synced while Records is mounted.
 */
export function RecordCountsProvider({ children }: { children: ReactNode }) {
  const db = useRxDb();
  const user = useUser();
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [latest, setLatest] = useState<Map<string, string>>(new Map());
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
      const newest = new Map<string, string>();
      const wanted = new Set(COUNTED_RESOURCE_TYPES);
      for (const doc of docs) {
        const resourceType = String(
          doc.get('data_record.resource_type') || '',
        ).toLowerCase();
        if (!resourceType || !wanted.has(resourceType)) continue;

        // Portals emit "no known allergy" / "not asked" as ordinary
        // AllergyIntolerance resources. The Allergies page lists them apart
        // from real allergens, so counting them here made the nav disagree
        // with the page (11 vs 6 in the demo set). Only this one type pays the
        // cost of reading its JSON; everything else stays on the fast path.
        if (resourceType === 'allergyintolerance') {
          const resource = doc.get('data_record.raw')?.resource;
          const name =
            doc.get('metadata.display_name') ||
            firstText(resource?.substance) ||
            firstText(resource?.code) ||
            '';
          if (resource && isAllergyNegation(resource, String(name))) continue;
        }

        tally.set(resourceType, (tally.get(resourceType) || 0) + 1);

        const date = String(doc.get('metadata.date') || '');
        const time = date ? Date.parse(date) : NaN;
        if (Number.isNaN(time)) continue;
        // Stored dates carry mixed offsets and precisions, so compare parsed
        // values rather than the raw strings.
        const best = newest.get(resourceType);
        if (!best || time > Date.parse(best)) newest.set(resourceType, date);
      }
      setCounts(tally);
      setLatest(newest);
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
      // Keep the last good tally if a change-triggered recompute fails.
      recompute().catch(() => undefined);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [db, user.id]);

  const value = useMemo<RecordCountsValue>(
    () => ({ counts, latest, status }),
    [counts, latest, status],
  );

  return (
    <RecordCountsContext.Provider value={value}>
      {children}
    </RecordCountsContext.Provider>
  );
}

export function useRecordCounts(): RecordCountsValue {
  return (
    useContext(RecordCountsContext) ?? {
      counts: new Map(),
      latest: new Map(),
      status: 'loading',
    }
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

/**
 * Why a category does or doesn't have a number, so callers can tell the cases
 * apart. Rendering "nothing" for an uncounted category made it look like an
 * empty one; each case now gets its own treatment.
 */
export type CategoryCount =
  | { kind: 'count'; value: number }
  /** Counted, but the tally hasn't finished yet. */
  | { kind: 'pending' }
  /** Counted, but the tally failed. */
  | { kind: 'unavailable' }
  /** No 1:1 resource-type mapping exists, so this category is never tallied. */
  | { kind: 'uncounted' };

export function categoryCount(
  category: RecordCategory,
  { counts, status }: RecordCountsValue,
): CategoryCount {
  if (!category.resourceTypes || category.resourceTypes.length === 0) {
    return { kind: 'uncounted' };
  }
  if (status === 'loading') return { kind: 'pending' };
  if (status === 'error') return { kind: 'unavailable' };
  return { kind: 'count', value: countForCategory(category, counts) ?? 0 };
}

/**
 * ISO date of the most recent record backing a category, or `undefined` when
 * the category isn't tallied or holds nothing dated.
 */
export function latestRecordDate(
  category: RecordCategory,
  latest: Map<string, string>,
): string | undefined {
  let best: string | undefined;
  for (const resourceType of category.resourceTypes ?? []) {
    const candidate = latest.get(resourceType);
    if (!candidate) continue;
    if (!best || Date.parse(candidate) > Date.parse(best)) best = candidate;
  }
  return best;
}
