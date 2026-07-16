import { useEffect, useState } from 'react';

import { useRxDb } from '../../../app/providers/RxDbProvider';
import { useUser } from '../../../app/providers/UserProvider';
import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../../models/connection-document/ConnectionDocument.type';
import { buildConditionBundles } from '../associations/buildBundles';
import { ConditionBundle } from '../types';

const MEDICATION_RESOURCE_TYPES = [
  'medicationstatement',
  'medicationrequest',
  'medicationorder',
  'medicationadministration',
  'medicationdispense',
];

async function find(
  db: ReturnType<typeof useRxDb>,
  userId: string,
  resourceType: string | string[],
): Promise<ClinicalDocument[]> {
  const docs = await db.clinical_documents
    .find({
      selector: {
        user_id: userId,
        'data_record.resource_type': Array.isArray(resourceType)
          ? { $in: resourceType }
          : resourceType,
      },
    })
    .exec();
  return docs.map((doc) => doc.toMutableJSON() as ClinicalDocument);
}

export function useConditionsData() {
  const db = useRxDb();
  const user = useUser();
  const [bundles, setBundles] = useState<ConditionBundle[]>([]);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setStatus('loading');
      setError(null);
      const [
        conditions,
        medications,
        observations,
        procedures,
        carePlans,
        goals,
        connectionDocs,
      ] = await Promise.all([
        find(db, user.id, 'condition'),
        find(db, user.id, MEDICATION_RESOURCE_TYPES),
        find(db, user.id, 'observation'),
        find(db, user.id, 'procedure'),
        find(db, user.id, 'careplan'),
        find(db, user.id, 'goal'),
        db.connection_documents.find({ selector: { user_id: user.id } }).exec(),
      ]);

      if (!isMounted) return;

      const connectionsById = new Map(
        connectionDocs.map((doc) => {
          const connection = doc.toMutableJSON() as ConnectionDocument;
          return [connection.id, connection] as const;
        }),
      );

      const built = buildConditionBundles({
        conditions,
        medications,
        observations,
        procedures,
        carePlans,
        goals,
        connectionsById,
      });

      // Active first, then by most related records, then name.
      built.sort((a, b) => {
        const statusRank = (s: ConditionBundle['status']) =>
          s === 'active' ? 0 : s === 'unknown' ? 1 : 2;
        const byStatus = statusRank(a.status) - statusRank(b.status);
        if (byStatus !== 0) return byStatus;
        if (b.related.length !== a.related.length) {
          return b.related.length - a.related.length;
        }
        return a.name.localeCompare(b.name);
      });

      setBundles(built);
      setStatus('success');
    }

    load().catch((e) => {
      if (!isMounted) return;
      setError(e instanceof Error ? e : new Error(String(e)));
      setStatus('error');
    });
    return () => {
      isMounted = false;
    };
  }, [db, user.id]);

  return { bundles, status, error };
}
