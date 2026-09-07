import { CircleStackIcon } from '@heroicons/react/24/outline';

import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { buildRecordProvenance } from './provenance';
import {
  entryMethodLabel,
  mappingLabel,
  sourceTypeLabel,
} from './provenanceLabels';

export function ProvenancePanel({
  document,
  connection,
}: {
  document: ClinicalDocument;
  connection?: Partial<ConnectionDocument>;
}) {
  const { t } = useInterfaceLanguage();
  const provenance = buildRecordProvenance(document, connection);
  // Where the record came from, in words. `manual-entry` and `manual` are how
  // this app stores those answers, not how anybody would give them.
  const rows = [
    ['Source', provenance.sourceName],
    ['Source type', sourceTypeLabel(provenance.sourceType)],
    ['How it arrived', entryMethodLabel(provenance.entryMethod)],
    [
      'Retrieved',
      provenance.retrievedAt &&
        safeFormatDate(provenance.retrievedAt, 'PP', ''),
    ],
    [
      'Recorded',
      provenance.recordedAt && safeFormatDate(provenance.recordedAt, 'PP', ''),
    ],
    ['Fields', mappingLabel(provenance.mappingConfidence)],
    ['Original file', provenance.originalFilename],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  // Facts about the file rather than about the record. True, worth keeping,
  // and not what somebody opening a consent form is asking — so they fold away
  // instead of sitting in the grid between the source and the date.
  const technical = [
    ['Original format', provenance.originalFormat],
    ['Content type', provenance.originalContentType],
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
      {technical.length > 0 && (
        <details className="mt-3">
          <summary className="inline-flex min-h-[44px] cursor-pointer items-center text-sm font-medium text-gray-600 hover:text-gray-900">
            {t('Technical details')}
          </summary>
          <dl className="mt-1 grid gap-2 text-sm sm:grid-cols-2">
            {technical.map(([label, value]) => (
              <div key={label}>
                <dt className="font-medium text-gray-500">{t(label)}</dt>
                <dd className="break-words font-mono text-xs text-gray-700">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}
      {provenance.notes && (
        <p className="mt-3 text-sm text-gray-700">{provenance.notes}</p>
      )}
    </section>
  );
}
