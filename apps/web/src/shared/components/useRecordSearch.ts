import { useEffect, useState } from 'react';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { safeFormatDate } from '../utils/dateFormatters';
import { recordSearchPath } from '../utils/recordSearchPath';
import { useRecordChangeTick } from '../utils/recordChangeSignal';
import { escapeRegExp } from '../utils/escapeRegExp';

export interface RecordSearchHit {
  id: string;
  name: string;
  resourceType: string;
  date?: string;
  dateLabel: string;
  path: string;
}

const MAX_HITS = 6;
const CANDIDATE_PAGE_SIZE = 24;
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
        const nextHits: RecordSearchHit[] = [];
        let offset = 0;
        // Some stored rows (for example provenance or an undated generic
        // resource) have no readable destination. Skip them before applying
        // the six-hit cap so they cannot hide a usable result further down.
        while (nextHits.length < MAX_HITS && !cancelled) {
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
            .skip(offset)
            .limit(CANDIDATE_PAGE_SIZE)
            .exec();

          if (cancelled) return;
          for (const doc of docs) {
            const path = recordSearchPath(
              doc.toMutableJSON() as ClinicalDocument,
            );
            if (!path) continue;
            const date = doc.get('metadata')?.date as string | undefined;
            nextHits.push({
              id: doc.get('id'),
              name: String(doc.get('metadata')?.display_name || 'Untitled'),
              resourceType: String(
                doc.get('data_record.resource_type') || 'record',
              ),
              date,
              dateLabel: safeFormatDate(date, 'PP', 'Undated'),
              path,
            });
            if (nextHits.length === MAX_HITS) break;
          }
          if (docs.length < CANDIDATE_PAGE_SIZE) break;
          offset += docs.length;
        }
        if (!cancelled) setHits(nextHits);
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
