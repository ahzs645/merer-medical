import { useEffect, useMemo, useState } from 'react';

import { useRxDb } from '../../../app/providers/RxDbProvider';
import { useUser } from '../../../app/providers/UserProvider';
import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import {
  IMAGING_RESOURCE_TYPES,
  mapImagingDocument,
} from '../../imaging/utils/imagingRecords';
import {
  DENTAL_CLAIM_RESOURCE_TYPES,
  buildDentalCounts,
  buildRecordsByTooth,
  filterDentalImaging,
  isDentalClaimDocument,
  isDentalDocument,
  mapDentalDocument,
} from '../utils/dentalRecords';
import {
  buildOdontogramStatuses,
  buildClaimSummaries,
  buildImagingMounts,
  buildPerioOverview,
  buildRecallItems,
  buildTreatmentPlan,
  buildToothTimeline,
  buildWorkflowContext,
} from '../utils/dentalClinicalModels';

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
  ...DENTAL_CLAIM_RESOURCE_TYPES,
] as const;

export function useDentalData() {
  const db = useRxDb(),
    user = useUser(),
    [documents, setDocuments] = useState<ClinicalDocument<unknown>[]>([]),
    [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading'),
    [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchDentalDocuments() {
      try {
        setStatus('loading');
        setError(null);

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
      } catch (err) {
        if (!isMounted) return;
        setError(
          err instanceof Error
            ? err
            : new Error('Failed to load dental records'),
        );
        setStatus('error');
      }
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
    const allDentalRecords = documents
      .filter(isDentalDocument)
      .map(mapDentalDocument);
    const records = allDentalRecords.filter(
      (record) => record.kind !== 'image',
    );
    const recordsByTooth = buildRecordsByTooth(records);
    const odontogramStatuses = buildOdontogramStatuses(recordsByTooth);

    // Coverage / claim / EOB resources are not always recognised as dental
    // records on their own, so collect them separately for the claims panel.
    const seenIds = new Set(records.map((record) => record.id));
    const claimRecords = [
      ...records,
      ...documents
        .filter(
          (document) =>
            isDentalClaimDocument(document) && !seenIds.has(document.id),
        )
        .map(mapDentalDocument),
    ];

    return {
      records,
      imaging,
      recordsByTooth,
      odontogramStatuses,
      treatmentPlan: buildTreatmentPlan(records),
      perioOverview: buildPerioOverview(records),
      toothTimeline: buildToothTimeline(odontogramStatuses),
      imagingMounts: buildImagingMounts(allDentalRecords),
      claimSummaries: buildClaimSummaries(claimRecords),
      recallItems: buildRecallItems(records),
      workflowContext: buildWorkflowContext(records, imaging.length),
      counts: buildDentalCounts(records, imaging),
    };
  }, [documents]);

  return { ...dentalData, status, error };
}
