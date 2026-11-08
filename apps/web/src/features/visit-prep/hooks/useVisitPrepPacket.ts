import { useEffect, useMemo, useState } from 'react';

import { useRxDb } from '../../../app/providers/RxDbProvider';
import { useUser } from '../../../app/providers/UserProvider';
import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { useRecordChangeTick } from '../../../shared/utils/recordChangeSignal';
import { buildPacket } from '../utils/packetBuilder';

export type VisitPacketStatus = 'loading' | 'success' | 'error';

export function useVisitPrepPacket() {
  const db = useRxDb();
  const user = useUser();
  const [snapshot, setSnapshot] = useState<{
    db: typeof db;
    userId: string;
    documents: ClinicalDocument[];
    status: VisitPacketStatus;
  } | null>(null);
  const recordChangeTick = useRecordChangeTick();

  useEffect(() => {
    let isCurrent = true;
    setSnapshot({ db, userId: user.id, documents: [], status: 'loading' });

    async function fetchDocuments() {
      try {
        const docs = await db.clinical_documents
          .find({
            selector: { user_id: user.id },
            sort: [{ 'metadata.date': 'desc' }],
          })
          .exec();
        if (!isCurrent) return;
        setSnapshot({
          db,
          userId: user.id,
          documents: docs.map((doc) => doc.toMutableJSON() as ClinicalDocument),
          status: 'success',
        });
      } catch {
        if (isCurrent) {
          setSnapshot({ db, userId: user.id, documents: [], status: 'error' });
        }
      }
    }

    void fetchDocuments();
    return () => {
      isCurrent = false;
    };
  }, [db, user.id, recordChangeTick]);

  // A selected profile/database can change before the fetch effect runs. Never
  // combine its name with the previous owner's packet, even for one render.
  const isCurrentOwner =
    snapshot !== null && snapshot.db === db && snapshot.userId === user.id;
  const status: VisitPacketStatus = isCurrentOwner
    ? snapshot.status
    : 'loading';
  const packet = useMemo(
    () =>
      buildPacket(
        isCurrentOwner && snapshot.status === 'success'
          ? snapshot.documents
          : [],
      ),
    [isCurrentOwner, snapshot],
  );

  return { packet, status };
}
