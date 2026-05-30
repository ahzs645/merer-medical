import { useEffect, useState } from 'react';
import { ConnectionDocument } from '../../../models/connection-document/ConnectionDocument.type';
import { useRxDb } from '../../../app/providers/RxDbProvider';
import { useUser } from '../../../app/providers/UserProvider';
import { LabDocument, ReportDocument, ReportLink } from '../types';
import { buildReportsByObservationId } from '../utils/reportLinks';
import { getFhirResource } from '../../../shared/utils/fhirResource';

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
    [status, setStatus] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    let isMounted = true;

    async function fetchLabs() {
      setStatus('loading');

      const [labDocs, reportDocs, connectionDocs] = await Promise.all([
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
      ]);

      if (!isMounted) return;

      const nextConnectionsById = new Map(
        connectionDocs.map((doc) => [
          doc.id,
          doc.toMutableJSON() as ConnectionDocument,
        ]),
      );

      setLabs(
        labDocs
          .map((doc) => doc.toMutableJSON() as unknown as LabDocument)
          .filter(isLaboratoryObservation),
      );
      setReportsByObservationId(
        buildReportsByObservationId(
          reportDocs.map(
            (doc) => doc.toMutableJSON() as unknown as ReportDocument,
          ),
          nextConnectionsById,
        ),
      );
      setConnectionsById(nextConnectionsById);
      setStatus('success');
    }

    fetchLabs();

    return () => {
      isMounted = false;
    };
  }, [db, user.id]);

  return {
    labs,
    reportsByObservationId,
    connectionsById,
    status,
  };
}

function isLaboratoryObservation(lab: LabDocument) {
  if (lab.metadata?.manual_specialty === 'laboratory') return true;
  const resource = getFhirResource<any>(lab);
  const categories = Array.isArray(resource?.category) ? resource.category : [];
  return categories.some((category: any) => {
    const text = String(category?.text || '').toLowerCase();
    const codes = (category?.coding || []).map((coding: any) =>
      String(coding?.code || coding?.display || '').toLowerCase(),
    );
    return text.includes('laboratory') || codes.includes('laboratory') || codes.includes('lab');
  });
}
