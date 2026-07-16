import { useEffect, useMemo, useState } from 'react';

import { useRxDb } from '../../../app/providers/RxDbProvider';
import { useUser } from '../../../app/providers/UserProvider';
import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { useRecordChangeTick } from '../../../shared/utils/recordChangeSignal';
import { buildPacket } from '../utils/packetBuilder';

export function useVisitPrepPacket() {
  const db = useRxDb();
  const user = useUser();
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [status, setStatus] = useState<'loading' | 'success'>('loading');
  // Refetch when a manual record is added, edited, or deleted.
  const recordChangeTick = useRecordChangeTick();

  useEffect(() => {
    let isMounted = true;

    async function fetchDocuments() {
      setStatus('loading');
      const docs = await db.clinical_documents
        .find({
          selector: { user_id: user.id },
          sort: [{ 'metadata.date': 'desc' }],
        })
        .exec();

      if (!isMounted) return;
      setDocuments(docs.map((doc) => doc.toMutableJSON() as ClinicalDocument));
      setStatus('success');
    }

    fetchDocuments();

    return () => {
      isMounted = false;
    };
  }, [db, user.id, recordChangeTick]);

  const packet = useMemo(() => buildPacket(documents), [documents]);

  return { packet, status };
}
