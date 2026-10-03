import { useState } from 'react';

import { isManualRecord } from '../../../shared/utils/manualRecordUtils';
import { ManualRecordActions } from '../../manual-entry/ManualRecordActions';
import { DentalRecord, DentalRecordKind } from '../types';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { useToothNumbering } from '../hooks/useToothNumbering';
import { formatTeeth } from '../utils/dentalReferenceData';
import { formatRecordDate } from '../../../shared/utils/dateFormatters';

const MAX_VISIBLE_RECORDS = 12;

/** What each kind is called on screen; the type names are the model's. */
export const KIND_LABELS: Record<DentalRecordKind, string> = {
  condition: 'Condition',
  finding: 'Finding',
  cleaning: 'Cleaning',
  orthodontic: 'Orthodontics',
  procedure: 'Procedure',
  treatmentPlan: 'Treatment plan',
  perio: 'Gum (perio) record',
  surgery: 'Surgery',
  note: 'Note',
  referral: 'Referral',
  image: 'Image or scan',
};

export function DentalRecordsPanel({ records }: { records: DentalRecord[] }) {
  const { t } = useInterfaceLanguage();
  const [numbering] = useToothNumbering();

  // Cleanings are surfaced in the hygiene workspace, so exclude them here. Do
  // the filtering up front so a patient who only has cleanings falls through to
  // the empty state instead of rendering an empty "has records" branch.
  const projectedRecords = records.filter(
    (record) => record.kind !== 'cleaning',
  );
  const [showAll, setShowAll] = useState(false);
  const visibleRecords = showAll
    ? projectedRecords
    : projectedRecords.slice(0, MAX_VISIBLE_RECORDS);

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-base font-semibold text-gray-900">
        {t('All dental records')}
      </h2>
      {visibleRecords.length > 0 ? (
        <>
          <div className="mt-3 grid gap-2">
            {visibleRecords.map((record) => {
              const details = [
                record.details?.dentalArch &&
                  `${t('Arch')}: ${record.details.dentalArch}`,
                record.details?.dentition &&
                  `${t('Dentition')}: ${record.details.dentition}`,
                record.details?.dentalStatus &&
                  `${t('Status')}: ${record.details.dentalStatus}`,
                record.details?.dentalSeverity &&
                  `${t('Severity')}: ${record.details.dentalSeverity}`,
                record.details?.procedureCode &&
                  `${t('Code')}: ${record.details.procedureCode}`,
              ].filter(Boolean);

              return (
                <article key={record.id} className="rounded-md bg-gray-50 p-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {record.title}
                    </h3>
                    <span className="shrink-0 text-xs font-medium text-gray-600">
                      {t(KIND_LABELS[record.kind])}
                      {record.date
                        ? ` · ${formatRecordDate(record.date, '')}`
                        : ''}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {record.toothNumbers.length > 0
                      ? `${t('Teeth')}: ${formatTeeth(record.toothNumbers, numbering)}`
                      : ''}
                    {record.surfaces.length > 0
                      ? ` · ${t('Surfaces')}: ${record.surfaces.join(', ')}`
                      : ''}
                  </p>
                  {details.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      {details.join(' · ')}
                    </p>
                  )}
                  {record.summary && (
                    <p className="mt-2 line-clamp-2 text-sm text-gray-700">
                      {record.summary}
                    </p>
                  )}
                  {isManualRecord(record.document) && (
                    <ManualRecordActions item={record.document} />
                  )}
                </article>
              );
            })}
          </div>
          {projectedRecords.length > MAX_VISIBLE_RECORDS && (
            // It used to say "Showing 12 of 18 records" with no way to see
            // the other six.
            <button
              type="button"
              onClick={() => setShowAll((value) => !value)}
              className="mt-2 inline-flex min-h-[44px] items-center text-sm font-medium text-primary-700 hover:text-primary-900"
            >
              {showAll
                ? t('Show fewer')
                : t('Show all {total} records').replace(
                    '{total}',
                    `${projectedRecords.length}`,
                  )}
            </button>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {t(
            'Dental findings, procedures, treatment plans, referrals, and perio records will appear here when synced or added.',
          )}
        </p>
      )}
    </section>
  );
}
