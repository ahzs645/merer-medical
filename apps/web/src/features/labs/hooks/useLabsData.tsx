import { useEffect, useState } from 'react';
import { ConnectionDocument } from '../../../models/connection-document/ConnectionDocument.type';
import { useRxDb } from '../../../app/providers/RxDbProvider';
import { useUser } from '../../../app/providers/UserProvider';
import {
  LabDocument,
  RecordCoverageSummary,
  ReportDocument,
  ReportLink,
} from '../types';
import { buildReportsByObservationId } from '../utils/reportLinks';
import { getFhirResource } from '../../../shared/utils/fhirResource';
import { ReferenceContext } from '../enrichment/types';

export function useLabsData() {
  const db = useRxDb(),
    user = useUser(),
    [labs, setLabs] = useState<LabDocument[]>([]),
    [reportsByObservationId, setReportsByObservationId] = useState<
      Map<string, ReportLink[]>
    >(new Map()),
    [connectionsById, setConnectionsById] = useState<
      Map<string, ConnectionDocument>
    >(new Map()),
    [referenceContext, setReferenceContext] = useState<ReferenceContext>(),
    [recordCoverage, setRecordCoverage] = useState<RecordCoverageSummary>({
      totalRecords: 0,
      labRows: 0,
      labPanels: 0,
      medicationRecords: 0,
      encounterRecords: 0,
      imagingRecords: 0,
      diagnosticReports: 0,
      patientRecords: 0,
    }),
    [status, setStatus] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    let isMounted = true;

    async function fetchLabs() {
      setStatus('loading');

      const [labDocs, reportDocs, connectionDocs, patientDocs, allDocs] =
        await Promise.all([
          db.clinical_documents
            .find({
              selector: {
                user_id: user.id,
                'data_record.resource_type': 'observation',
                'metadata.date': { $nin: [null, undefined, ''] },
              },
              sort: [{ 'metadata.date': 'desc' }],
            })
            .exec(),
          db.clinical_documents
            .find({
              selector: {
                user_id: user.id,
                'data_record.resource_type': 'diagnosticreport',
              },
            })
            .exec(),
          db.connection_documents
            .find({
              selector: {
                user_id: user.id,
              },
            })
            .exec(),
          db.clinical_documents
            .find({
              selector: {
                user_id: user.id,
                'data_record.resource_type': 'patient',
              },
            })
            .exec(),
          db.clinical_documents
            .find({
              selector: {
                user_id: user.id,
                'data_record.resource_type': {
                  $nin: ['documentreference_attachment', 'provenance'],
                },
              },
            })
            .exec(),
        ]);

      if (!isMounted) return;

      const nextConnectionsById = new Map(
        connectionDocs.map((doc) => [
          doc.id,
          doc.toMutableJSON() as ConnectionDocument,
        ]),
      );

      const nextLabs = labDocs
        .map((doc) => doc.toMutableJSON() as unknown as LabDocument)
        .filter(isLaboratoryObservation);
      const allClinicalDocs = allDocs.map((doc) => doc.toMutableJSON() as any);
      const nextReferenceContext = buildReferenceContext(
        user,
        patientDocs.map((doc) => doc.toMutableJSON() as any),
      );

      setLabs(nextLabs);
      setReportsByObservationId(
        buildReportsByObservationId(
          reportDocs.map(
            (doc) => doc.toMutableJSON() as unknown as ReportDocument,
          ),
          nextConnectionsById,
        ),
      );
      setConnectionsById(nextConnectionsById);
      setReferenceContext(nextReferenceContext);
      setRecordCoverage(buildRecordCoverage(allClinicalDocs, nextLabs));
      setStatus('success');
    }

    fetchLabs();

    return () => {
      isMounted = false;
    };
  }, [db, user.birthday, user.gender, user.id]);

  return {
    labs,
    reportsByObservationId,
    connectionsById,
    referenceContext,
    recordCoverage,
    status,
  };
}

export function isLaboratoryObservation(lab: LabDocument) {
  if (lab.metadata?.manual_specialty === 'laboratory') return true;
  const raw = lab.data_record?.raw as { manual_kind?: string } | undefined;
  if (raw?.manual_kind === 'lab') return true;

  const resource = getFhirResource<any>(lab);
  const categories = Array.isArray(resource?.category)
    ? resource.category
    : resource?.category
      ? [resource.category]
      : [];
  return categories.some((category: any) => {
    const text = String(category?.text || '').toLowerCase();
    const codes = (category?.coding || []).map((coding: any) =>
      String(coding?.code || coding?.display || '').toLowerCase(),
    );
    return (
      text.includes('laboratory') ||
      codes.includes('laboratory') ||
      codes.includes('lab')
    );
  });
}

function buildReferenceContext(
  user: ReturnType<typeof useUser>,
  patientDocs: any[],
): ReferenceContext | undefined {
  const patientResources = patientDocs
    .map((doc) => getFhirResource<any>(doc))
    .filter(Boolean);
  const birthDate =
    user.birthday ||
    patientResources.map((patient) => patient?.birthDate).find(isPresent);
  const sex = normalizePatientSex(
    user.gender ||
      patientResources.map((patient) => patient?.gender).find(isPresent),
  );
  const ageYears = calculateAgeYears(birthDate);

  if (ageYears === undefined && sex === 'unknown') return undefined;

  return {
    ageYears: ageYears ?? 40,
    sex,
    birthDate,
  };
}

function buildRecordCoverage(
  clinicalDocs: any[],
  labs: LabDocument[],
): RecordCoverageSummary {
  const resourceTypes = clinicalDocs.map((doc) =>
    String(doc?.data_record?.resource_type || '').toLowerCase(),
  );
  const diagnosticReports = resourceTypes.filter(
    (type) => type === 'diagnosticreport',
  ).length;

  return {
    totalRecords: clinicalDocs.length,
    labRows: labs.length,
    labPanels: new Set(
      labs.map(
        (lab) => lab.metadata?.date || lab.metadata?.source_name || lab.id,
      ),
    ).size,
    medicationRecords: resourceTypes.filter((type) =>
      ['medication', 'medicationrequest', 'medicationstatement'].includes(type),
    ).length,
    encounterRecords: resourceTypes.filter((type) => type === 'encounter')
      .length,
    imagingRecords: clinicalDocs.filter(isImagingRecord).length,
    diagnosticReports,
    patientRecords: resourceTypes.filter((type) => type === 'patient').length,
  };
}

function isImagingRecord(doc: any): boolean {
  const resourceType = String(
    doc?.data_record?.resource_type || '',
  ).toLowerCase();
  const specialty = String(doc?.metadata?.manual_specialty || '').toLowerCase();
  const display = String(doc?.metadata?.display_name || '').toLowerCase();
  const resource = getFhirResource<any>(doc);
  const categories = Array.isArray(resource?.category)
    ? resource.category
    : [resource?.category];
  const categoryText = categories
    .flatMap((category: any) => [
      category?.text,
      ...(category?.coding || []).flatMap((coding: any) => [
        coding?.code,
        coding?.display,
      ]),
    ])
    .filter(isPresent)
    .join(' ')
    .toLowerCase();

  return (
    specialty === 'imaging' ||
    display.includes('imaging') ||
    display.includes('radiology') ||
    categoryText.includes('imaging') ||
    categoryText.includes('radiology') ||
    (resourceType === 'diagnosticreport' && categoryText.includes('rad'))
  );
}

function normalizePatientSex(value: unknown): ReferenceContext['sex'] {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'male' || normalized === 'm') return 'male';
  if (normalized === 'female' || normalized === 'f') return 'female';
  return 'unknown';
}

function calculateAgeYears(birthDate?: string): number | undefined {
  if (!birthDate) return undefined;
  const birth = new Date(`${birthDate}T00:00:00Z`);
  if (Number.isNaN(birth.getTime())) return undefined;
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - birth.getUTCMonth();
  if (
    monthDelta < 0 ||
    (monthDelta === 0 && now.getUTCDate() < birth.getUTCDate())
  ) {
    age -= 1;
  }
  return age >= 0 && age < 130 ? age : undefined;
}

function isPresent(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
