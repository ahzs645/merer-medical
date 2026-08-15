import { useEffect, useMemo, useState } from 'react';

import { useRxDb } from '../../../app/providers/RxDbProvider';
import { useUser } from '../../../app/providers/UserProvider';
import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../../models/connection-document/ConnectionDocument.type';
import { getFhirResource } from '../../../shared/utils/fhirResource';
import { parseDateAsUtc } from '../../../shared/utils/parseDateAsUtc';
import {
  ReferenceContext,
  ReferenceOverlayMode,
} from '../../labs/enrichment/types';
import { buildResultsViewModel } from '../utils/resultNormalization';
import { useRecordChangeTick } from '../../../shared/utils/recordChangeSignal';

export function useResultsData(
  referenceMode: ReferenceOverlayMode = 'canadian',
) {
  const db = useRxDb();
  const user = useUser();
  // Refetch when records land — a portal sync or an .emrpkg import
  // writes straight to the collection, and this page reads it once.
  const recordChangeTick = useRecordChangeTick();
  const [documents, setDocuments] = useState<ClinicalDocument<any>[]>([]);
  const [connections, setConnections] = useState<ConnectionDocument[]>([]);
  const [referenceContext, setReferenceContext] = useState<ReferenceContext>();
  const [status, setStatus] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    let isMounted = true;

    async function fetchResults() {
      setStatus('loading');
      const [clinicalDocs, connectionDocs, patientDocs] = await Promise.all([
        db.clinical_documents
          .find({
            selector: {
              user_id: user.id,
              'data_record.resource_type': {
                $nin: ['provenance'],
              },
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
      ]);

      if (!isMounted) return;

      const nextDocuments = clinicalDocs.map(
        (doc) => doc.toMutableJSON() as ClinicalDocument<any>,
      );
      const nextConnections = connectionDocs.map(
        (doc) => doc.toMutableJSON() as ConnectionDocument,
      );
      const nextPatients = patientDocs.map(
        (doc) => doc.toMutableJSON() as ClinicalDocument<any>,
      );

      setDocuments(nextDocuments);
      setConnections(nextConnections);
      setReferenceContext(buildReferenceContext(user, nextPatients));
      setStatus('success');
    }

    fetchResults();

    return () => {
      isMounted = false;
    };
  }, [db, user.birthday, user.gender, user.id, recordChangeTick]);

  const viewModel = useMemo(
    () =>
      buildResultsViewModel({
        clinicalDocuments: documents,
        connectionDocuments: connections,
        referenceMode,
        referenceContext,
      }),
    [connections, documents, referenceContext, referenceMode],
  );

  return {
    ...viewModel,
    referenceContext,
    status,
  };
}

function buildReferenceContext(
  user: ReturnType<typeof useUser>,
  patientDocs: ClinicalDocument<any>[],
): ReferenceContext | undefined {
  const patientResources = patientDocs
    .map((doc) => getFhirResource<any>(doc))
    .filter(Boolean);
  const birthDate =
    user.birthday ||
    patientResources
      .map((patient) => patient?.birthDate)
      .find((value) => value !== undefined && value !== null && value !== '');
  const sex = normalizePatientSex(
    user.gender ||
      patientResources
        .map((patient) => patient?.gender)
        .find((value) => value !== undefined && value !== null && value !== ''),
  );
  const ageYears = calculateAgeYears(birthDate);

  if (ageYears === undefined && sex === 'unknown') return undefined;

  return {
    ageYears: ageYears ?? 40,
    sex,
    birthDate,
  };
}

function normalizePatientSex(value: unknown): ReferenceContext['sex'] {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'male' || normalized === 'm') return 'male';
  if (normalized === 'female' || normalized === 'f') return 'female';
  return 'unknown';
}

function calculateAgeYears(birthDate?: string): number | undefined {
  const birth = parseDateAsUtc(birthDate);
  if (!birth) return undefined;
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
