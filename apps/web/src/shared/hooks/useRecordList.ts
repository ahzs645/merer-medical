import { useEffect, useRef, useState } from 'react';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
import type { RecordListStatus } from '../components/records/RecordListPage';
import { useRecordChangeTick } from '../utils/recordChangeSignal';

export type { RecordListStatus };

export interface UseRecordListOptions<T> {
  /**
   * FHIR resource types to fetch, matched against
   * `data_record.resource_type` (lowercase, e.g. 'allergyintolerance').
   */
  resourceTypes: string[];
  /**
   * Maps the fetched clinical documents (already converted to plain JSON)
   * to the tab's view items. `connectionsById` holds the user's connection
   * documents keyed by id, for resolving source names.
   */
  mapDocs: (
    docs: ClinicalDocument[],
    connectionsById: Map<string, ConnectionDocument>,
  ) => T[];
  /** Optional comparator applied to the mapped items. */
  sort?: (a: T, b: T) => number;
}

/**
 * Newest-first comparator for record list items carrying an ISO-ish `date`
 * string — the shared sort used by most record tabs.
 */
export function compareByDateDesc<T extends { date?: string }>(
  a: T,
  b: T,
): number {
  return (b.date || '').localeCompare(a.date || '');
}

/**
 * Shared loader for the "simple" record tabs (Allergies, Referrals,
 * Procedures, Encounters, Goals, …): fetches the user's clinical documents
 * for the given resource types together with their connection documents,
 * maps them to view items, and exposes a loading / success / error status
 * for RecordListPage.
 *
 * Re-fetches automatically when records change (manual add / edit / delete)
 * via the shared record-change signal, so lists refresh in place.
 */
export function useRecordList<T>(options: UseRecordListOptions<T>): {
  items: T[];
  connectionsById: Map<string, ConnectionDocument>;
  status: RecordListStatus;
  error: Error | null;
} {
  const db = useRxDb();
  const user = useUser();
  // Refetch when a manual record is added, edited, or deleted.
  const recordChangeTick = useRecordChangeTick();

  const [items, setItems] = useState<T[]>([]);
  const [connectionsById, setConnectionsById] = useState<
    Map<string, ConnectionDocument>
  >(() => new Map());
  const [status, setStatus] = useState<RecordListStatus>('loading');
  const [error, setError] = useState<Error | null>(null);

  // Read callbacks through a ref so inline `mapDocs` / `sort` options don't
  // retrigger the fetch on every render.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Stable dependency key for the resource type list.
  const resourceTypesKey = options.resourceTypes.join(',');

  useEffect(() => {
    let isMounted = true;

    async function fetchRecords() {
      setStatus('loading');
      setError(null);

      const { resourceTypes } = optionsRef.current;
      const [docs, connectionDocs] = await Promise.all([
        db.clinical_documents
          .find({
            selector: {
              user_id: user.id,
              'data_record.resource_type':
                resourceTypes.length === 1
                  ? resourceTypes[0]
                  : { $in: resourceTypes },
            },
          })
          .exec(),
        db.connection_documents.find({ selector: { user_id: user.id } }).exec(),
      ]);
      if (!isMounted) return;

      const connById = new Map(
        connectionDocs.map((doc) => {
          const connection = doc.toMutableJSON() as ConnectionDocument;
          return [connection.id, connection] as const;
        }),
      );
      const { mapDocs, sort } = optionsRef.current;
      const list = mapDocs(
        docs.map((doc) => doc.toMutableJSON() as ClinicalDocument),
        connById,
      );
      if (sort) list.sort(sort);
      setConnectionsById(connById);
      setItems(list);
      setStatus('success');
    }

    fetchRecords().catch((e) => {
      if (!isMounted) return;
      setError(e instanceof Error ? e : new Error(String(e)));
      setStatus('error');
    });

    return () => {
      isMounted = false;
    };
  }, [db, user.id, resourceTypesKey, recordChangeTick]);

  return { items, connectionsById, status, error };
}
