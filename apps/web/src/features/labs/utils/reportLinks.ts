import { ConnectionDocument } from '../../../models/connection-document/ConnectionDocument.type';
import { getDiagnosticReportPerformer } from '../../../shared/utils/fhirAccessHelpers';
import { resolveObservationReferences } from '../../../shared/utils/fhirReferenceResolver';
import { ReportDocument, ReportLink } from '../types';

export function buildReportsByObservationId(
  reports: ReportDocument[],
  connectionsById: Map<string, ConnectionDocument>,
): Map<string, ReportLink[]> {
  const map = new Map<string, ReportLink[]>();

  reports.forEach((report) => {
    const references = report.data_record.raw.resource?.result || [];
    if (references.length === 0) return;

    const connection = connectionsById.get(report.connection_record_id),
      resolvedReferences = resolveObservationReferences({
        references: references.filter((item) => item.reference) as Array<{
          reference: string;
        }>,
        baseUrl: connection?.location as string | undefined,
      });

    resolvedReferences.forEach((reference) => {
      const reportLinks = map.get(reference) || [];
      reportLinks.push({
        id: report.id,
        date: report.metadata?.date,
        displayName: report.metadata?.display_name
          ?.replace(/- final result/gi, '')
          .replace(/- final/gi, ''),
        performer: getDiagnosticReportPerformer(report),
      });
      map.set(reference, reportLinks);
    });
  });

  return map;
}
