import { useEffect, useState } from 'react';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { RecordCategory } from './recordCategories';

export interface RecordCountsResult {
  counts: Map<string, number>;
  status: 'loading' | 'success' | 'error';
}

/**
 * Tallies the user's clinical documents by FHIR resource_type so the browse
 * hub and side nav can show approximate per-category counts. One pass over the
 * collection; resource types are lower-cased to match the category config.
 */
export function useRecordCounts(): RecordCountsResult {
  const db = useRxDb();
  const user = useUser();
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );

  useEffect(() => {
    let mounted = true;
    async function load() {
      setStatus('loading');
      const docs = await db.clinical_documents
        .find({ selector: { user_id: user.id } })
        .exec();
      if (!mounted) return;
      const tally = new Map<string, number>();
      for (const doc of docs) {
        const resourceType = String(
          doc.get('data_record.resource_type') || '',
        ).toLowerCase();
        if (!resourceType) continue;
        tally.set(resourceType, (tally.get(resourceType) || 0) + 1);
      }
      setCounts(tally);
      setStatus('success');
    }
    load().catch(() => {
      if (mounted) setStatus('error');
    });
    return () => {
      mounted = false;
    };
  }, [db, user.id]);

  return { counts, status };
}

/**
 * Approximate record count for a category, or `undefined` when the category has
 * no resource-type mapping (so callers can render nothing instead of "0").
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
