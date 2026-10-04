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
  DENTAL_CLAIM_RESOURCE_TYPES,
  buildDentalCounts,
  buildRecordsByTooth,
  DentalMappingOptions,
  filterDentalImaging,
  freeTextToothTokens,
  inferSourceNumbering,
  isDentalClaimDocument,
  isDentalDocument,
  mapDentalDocument,
} from '../utils/dentalRecords';
import { useToothNumbering } from './useToothNumbering';
import {
  buildOdontogramStatuses,
  buildClaimSummaries,
  buildImagingMounts,
  buildPerioOverview,
  buildRecallItems,
  buildNextCleaning,
  buildTreatmentPlan,
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
    // Without this a record deleted from a dental panel stays on screen — and
    // in the tooth chart and counts derived from it — until a reload.
    recordChangeTick = useRecordChangeTick(),
    [documents, setDocuments] = useState<ClinicalDocument<unknown>[]>([]),
    [readerNumbering] = useToothNumbering(),
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
  }, [db, user.id, recordChangeTick]);

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
    const dentalDocuments = documents.filter(isDentalDocument);
    const numberingFor = buildNumberingBySource(
      dentalDocuments,
      readerNumbering,
    );
    const allDentalRecords = dentalDocuments.map((document) =>
      mapDentalDocument(document, numberingFor(document)),
    );
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
        .map((document) => mapDentalDocument(document, numberingFor(document))),
    ];

    return {
      records,
      imaging,
      recordsByTooth,
      odontogramStatuses,
      treatmentPlan: buildTreatmentPlan(records),
      perioOverview: buildPerioOverview(records),
      imagingMounts: buildImagingMounts(allDentalRecords),
      claimSummaries: buildClaimSummaries(claimRecords),
      recallItems: buildRecallItems(records),
      nextCleaning: buildNextCleaning(records),
      workflowContext: buildWorkflowContext(records, imaging.length),
      counts: buildDentalCounts(records, imaging),
    };
  }, [documents, readerNumbering]);

  return { ...dentalData, status, error };
}

/**
 * How to read each record's unlabelled tooth numbers. A portal or practice
 * writes teeth one way, so its records are judged together: if the numbers it
 * uses only exist in FDI (or only in Universal), that is how its ambiguous
 * 11–32 are read too. A source that gives nothing away falls back to the
 * reader's setting — except hand-entered records saved before the form
 * stored a numbering, which were always meant as Universal.
 */
function buildNumberingBySource(
  documents: ClinicalDocument<unknown>[],
  readerNumbering: 'universal' | 'fdi',
): (document: ClinicalDocument<unknown>) => DentalMappingOptions {
  const tokensBySource = new Map<string, string[]>();
  for (const document of documents) {
    const source = document.connection_record_id || '';
    tokensBySource.set(source, [
      ...(tokensBySource.get(source) || []),
      ...freeTextToothTokens(document),
    ]);
  }
  const inferred = new Map(
    [...tokensBySource].map(([source, tokens]) => [
      source,
      inferSourceNumbering(tokens),
    ]),
  );
  return (document) => {
    const fromSource = inferred.get(document.connection_record_id || '');
    if (fromSource) return { numbering: fromSource, numberingBasis: 'source' };
    if (document.metadata?.entry_method === 'manual-entry') {
      return { numbering: 'universal', numberingBasis: 'source' };
    }
    return { numbering: readerNumbering, numberingBasis: 'reader' };
  };
}
