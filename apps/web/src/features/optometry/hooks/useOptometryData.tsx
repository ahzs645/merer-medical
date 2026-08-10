import { useEffect, useMemo, useState } from 'react';

import { useRxDb } from '../../../app/providers/RxDbProvider';
import { useUser } from '../../../app/providers/UserProvider';
import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { useRecordChangeTick } from '../../../shared/utils/recordChangeSignal';
import {
  IMAGING_RESOURCE_TYPES,
  mapImagingDocument,
} from '../../imaging/utils/imagingRecords';
import {
  buildOptometryCounts,
  filterEyeImaging,
  isOptometryDocument,
  mapOptometryDocument,
} from '../utils/optometryRecords';

const OPTOMETRY_RESOURCE_TYPES = [
  'appointment',
  'condition',
  'coverage',
  'diagnosticreport',
  'documentreference',
  'documentreference_attachment',
  'encounter',
  'imagingstudy',
  'media',
  'medicationrequest',
  'medicationstatement',
  'observation',
  'procedure',
  'questionnaireresponse',
  'servicerequest',
  'visionprescription',
] as const;

export function useOptometryData() {
  const db = useRxDb(),
    user = useUser(),
    // Without this a prescription deleted from a panel stays on screen — and
    // stays "Current" in the timeline — until a reload.
    recordChangeTick = useRecordChangeTick(),
    [documents, setDocuments] = useState<ClinicalDocument<unknown>[]>([]),
    [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading'),
    [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchOptometryDocuments() {
      try {
        setStatus('loading');
        setError(null);

        const docs = await db.clinical_documents
          .find({
            selector: {
              user_id: user.id,
              'data_record.resource_type': {
                $in: [...OPTOMETRY_RESOURCE_TYPES],
              },
            },
            sort: [{ 'metadata.date': 'desc' }],
          })
          .exec();

        if (!isMounted) return;

        setDocuments(
          docs.map((doc) => doc.toMutableJSON() as ClinicalDocument<unknown>),
        );
        setStatus('success');
      } catch (err) {
        if (!isMounted) return;
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to load optometry records'),
        );
        setStatus('error');
      }
    }

    fetchOptometryDocuments();

    return () => {
      isMounted = false;
    };
  }, [db, user.id, recordChangeTick]);

  const optometryData = useMemo(() => {
    const imaging = filterEyeImaging(
      documents
        .filter((document) =>
          IMAGING_RESOURCE_TYPES.includes(
            document.data_record.resource_type as any,
          ),
        )
        .map(mapImagingDocument),
    );
    const records = documents
      .filter(isOptometryDocument)
      .map(mapOptometryDocument);

    return {
      records,
      imaging,
      counts: buildOptometryCounts(records, imaging),
    };
  }, [documents]);

  return { ...optometryData, status, error };
}
