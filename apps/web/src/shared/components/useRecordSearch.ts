import { useEffect, useState } from 'react';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { safeFormatDate } from '../utils/dateFormatters';
import { recordSearchPath } from '../utils/recordSearchPath';
import { useRecordChangeTick } from '../utils/recordChangeSignal';

export interface RecordSearchHit {
  id: string;
  name: string;
  resourceType: string;
  date?: string;
  dateLabel: string;
  path: string;
}

/** Regex metacharacters, so a typed "(" cannot blow up the query. */
function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const MAX_HITS = 6;
const DEBOUNCE_MS = 200;

/**
 * The user's own records, matched by display name, for the Records hub and
 * command palette.
 *
 * The command palette — the search behind the rail's magnifying glass and the
 * phone's More → Search — offered pages only, while its placeholder promised
 * "records, pages, and actions". Typing "blood" returned the Labs page and the
 * Trackers page and nothing you own. This is the missing half.
 *
 * It matches `metadata.display_name` the same way the timeline's own search
 * does, so the two agree about what "matching" means.
 */
export function useRecordSearch(query: string): {
  hits: RecordSearchHit[];
  searching: boolean;
  error: boolean;
} {
  const db = useRxDb();
  const user = useUser();
  const [hits, setHits] = useState<RecordSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(false);
  const recordChangeTick = useRecordChangeTick();

  useEffect(() => {
    const trimmed = query.trim();
    if (!db || !user?.id || trimmed.length < 2) {
      setHits([]);
      setSearching(false);
      setError(false);
      return;
    }

    let cancelled = false;
    setHits([]);
    setError(false);
    setSearching(true);

    const timer = setTimeout(async () => {
      try {
        const docs = await db.clinical_documents
          .find({
            selector: {
              user_id: user.id,
              'metadata.display_name': {
                $regex: `.*${escapeRegExp(trimmed)}.*`,
                $options: 'si',
              },
            },
            sort: [{ 'metadata.date': 'desc' }],
          })
          .limit(MAX_HITS)
          .exec();

        if (cancelled) return;
        setHits(
          docs.map((doc) => {
            const date = doc.get('metadata')?.date as string | undefined;
            return {
              id: doc.get('id'),
              name: String(doc.get('metadata')?.display_name || 'Untitled'),
              resourceType: String(
                doc.get('data_record.resource_type') || 'record',
              ),
              date,
              dateLabel: safeFormatDate(date, 'PP', 'Undated'),
              path: recordSearchPath(doc.toMutableJSON() as ClinicalDocument),
            };
          }),
        );
      } catch (error) {
        console.error('Record search failed', error);
        if (!cancelled) {
          setHits([]);
          setError(true);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [db, query, user?.id, recordChangeTick]);

  return { hits, searching, error };
}
