import { useEffect, useMemo, useState } from 'react';

import { useRxDb } from '../../../app/providers/RxDbProvider';
import { useUser } from '../../../app/providers/UserProvider';
import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import {
  IMAGING_RESOURCE_TYPES,
  mapImagingDocument,
} from '../../imaging/utils/imagingRecords';
import {
  buildDentalCounts,
  buildRecordsByTooth,
  filterDentalImaging,
  isDentalDocument,
  mapDentalDocument,
} from '../utils/dentalRecords';

const DENTAL_RESOURCE_TYPES = [
  'condition',
  'careplan',
  'diagnosticreport',
  'documentreference',
  'documentreference_attachment',
  'encounter',
  'imagingstudy',
  'media',
  'observation',
  'procedure',
  'servicerequest',
] as const;

export function useDentalData() {
  const db = useRxDb(),
    user = useUser(),
    [documents, setDocuments] = useState<ClinicalDocument<unknown>[]>([]),
    [status, setStatus] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    let isMounted = true;

    async function fetchDentalDocuments() {
      setStatus('loading');

      const docs = await db.clinical_documents
        .find({
          selector: {
            user_id: user.id,
            'data_record.resource_type': { $in: [...DENTAL_RESOURCE_TYPES] },
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

    fetchDentalDocuments();

    return () => {
      isMounted = false;
    };
  }, [db, user.id]);

  const dentalData = useMemo(() => {
    const imaging = filterDentalImaging(
      documents
        .filter((document) =>
          IMAGING_RESOURCE_TYPES.includes(
            document.data_record.resource_type as any,
          ),
        )
        .map(mapImagingDocument),
    );
    const records = documents
      .filter(isDentalDocument)
      .map(mapDentalDocument)
      .filter((record) => record.kind !== 'image');

    return {
      records,
      imaging,
      recordsByTooth: buildRecordsByTooth(records),
      counts: buildDentalCounts(records, imaging),
    };
  }, [documents]);

  return { ...dentalData, status };
}
