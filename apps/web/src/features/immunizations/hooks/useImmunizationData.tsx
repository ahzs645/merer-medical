import { useEffect, useMemo, useState } from 'react';

import { useRxDb } from '../../../app/providers/RxDbProvider';
import { useUser } from '../../../app/providers/UserProvider';
import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import {
  buildImmunizationCounts,
  mapImmunizationDocument,
} from '../utils/immunizationRecords';

export function useImmunizationData() {
  const db = useRxDb(),
    user = useUser(),
    [documents, setDocuments] = useState<ClinicalDocument<unknown>[]>([]),
    [status, setStatus] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    let isMounted = true;

    async function fetchImmunizationDocuments() {
      setStatus('loading');

      const docs = await db.clinical_documents
        .find({
          selector: {
            user_id: user.id,
            'data_record.resource_type': 'immunization',
          },
          sort: [{ 'metadata.date': 'desc' }],
        })
        .exec();

      if (!isMounted) return;

      setDocuments(
        docs.map((doc) => doc.toMutableJSON() as ClinicalDocument<unknown>),
      );
      setStatus('success');
    }

    fetchImmunizationDocuments();

    return () => {
      isMounted = false;
    };
  }, [db, user.id]);

  const immunizationData = useMemo(() => {
    const records = documents.map(mapImmunizationDocument);
    return {
      records,
      counts: buildImmunizationCounts(records),
    };
  }, [documents]);

  return { ...immunizationData, status };
}
