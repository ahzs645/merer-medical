import { CircleStackIcon } from '@heroicons/react/24/outline';

import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { buildRecordProvenance } from './provenance';

export function ProvenancePanel({
  document,
  connection,
}: {
  document: ClinicalDocument;
  connection?: Partial<ConnectionDocument>;
}) {
  const { t } = useInterfaceLanguage();
  const provenance = buildRecordProvenance(document, connection);
  const rows = [
    ['Source', provenance.sourceName],
    ['Source type', provenance.sourceType],
    [
      'Retrieved',
      provenance.retrievedAt && safeFormatDate(provenance.retrievedAt, 'PP', ''),
    ],
    [
      'Recorded',
      provenance.recordedAt && safeFormatDate(provenance.recordedAt, 'PP', ''),
    ],
    ['Entry method', provenance.entryMethod],
    ['Original format', provenance.originalFormat],
    ['Content type', provenance.originalContentType],
    ['Mapping', provenance.mappingConfidence],
    ['Original file', provenance.originalFilename],
    ['Record ID', document.id],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return (
    <section className="rounded-md border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        <CircleStackIcon className="h-5 w-5 text-primary-700" />
        {t('Source and provenance')}
      </div>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="font-medium text-gray-500">{t(label)}</dt>
            <dd className="break-words text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>
      {provenance.notes && (
        <p className="mt-3 text-sm text-gray-700">{provenance.notes}</p>
      )}
    </section>
  );
}
