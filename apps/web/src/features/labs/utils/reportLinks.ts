import { ConnectionDocument } from '../../../models/connection-document/ConnectionDocument.type';
import { getDiagnosticReportPerformer } from '../../../shared/utils/fhirAccessHelpers';
import { resolveObservationReferenceKeys } from '../../../shared/utils/fhirReferenceResolver';
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
      referenceKeys = resolveObservationReferenceKeys({
        references: references.filter((item) => item.reference) as Array<{
          reference: string;
        }>,
        baseUrl: connection?.location as string | undefined,
      });

    const reportLink = {
      id: report.id,
      date: report.metadata?.date,
      displayName: report.metadata?.display_name
        ?.replace(/- final result/gi, '')
        .replace(/- final/gi, ''),
      performer: getDiagnosticReportPerformer(report),
    };

    referenceKeys.forEach((reference) => {
      const reportLinks = map.get(reference) || [];
      if (!reportLinks.some((item) => item.id === reportLink.id)) {
        reportLinks.push(reportLink);
      }
      map.set(reference, reportLinks);
    });
  });

  return map;
}
