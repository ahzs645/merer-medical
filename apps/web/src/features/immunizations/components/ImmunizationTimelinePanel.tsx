import { useMemo } from 'react';

import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { safeFormatDate } from '../../../shared/utils/dateFormatters';
import { isManualRecord } from '../../../shared/utils/manualRecordUtils';
import { ManualRecordActions } from '../../manual-entry/ManualRecordActions';
import { ImmunizationRecord } from '../types';

type TimelineYear = {
  year: string;
  records: ImmunizationRecord[];
};

function groupByYear(records: ImmunizationRecord[]): TimelineYear[] {
  const groups: TimelineYear[] = [];
  for (const record of records) {
    const year = record.date?.slice(0, 4) || '—';
    const last = groups[groups.length - 1];
    if (last && last.year === year) {
      last.records.push(record);
    } else {
      groups.push({ year, records: [record] });
    }
  }
  return groups;
}

export function ImmunizationTimelinePanel({
  records,
}: {
  records: ImmunizationRecord[];
}) {
  const { t } = useInterfaceLanguage();
  // Records arrive newest-first from the data hook; preserve that order.
  const years = useMemo(() => groupByYear(records), [records]);

  return (
    <section className="min-w-0 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {t('Immunization timeline')}
          </h2>
          <p className="mt-0.5 text-sm text-gray-600">
            {t('Every dose, most recent first.')}
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-600">
          {records.length} {t('doses')}
        </span>
      </div>

      {records.length > 0 ? (
        <div className="mt-4 space-y-4">
          {years.map((group) => (
            <div key={group.year}>
              <div className="sticky top-0 z-10 -mx-1 mb-2 bg-white/90 px-1 py-1 backdrop-blur">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-600">
                  {group.year}
                </span>
              </div>
              <ol className="space-y-2.5 border-s border-gray-200 ps-4">
                {group.records.map((record) => (
                  <li key={record.id} className="relative">
                    <span className="absolute -left-[1.30rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary-500 ring-4 ring-white" />
                    <div className="rounded-lg bg-gray-50 p-3 ring-1 ring-inset ring-gray-200">
                      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                        <h3 className="min-w-0 text-sm font-semibold text-gray-900">
                          {record.vaccineName}
                        </h3>
                        <span className="shrink-0 text-xs font-medium text-gray-500">
                          {safeFormatDate(
                            record.date,
                            'MMM d, yyyy',
                            t('Undated'),
                          )}
                        </span>
                      </div>
                      {(record.manufacturer || record.performer) && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {[record.manufacturer, record.performer]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                      {(record.lotNumber ||
                        record.status ||
                        record.doseNumber) && (
                        <p className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-gray-500">
                          {record.doseNumber && (
                            <span>
                              {t('Dose')} {record.doseNumber}
                            </span>
                          )}
                          {record.lotNumber && (
                            <span>
                              {t('Lot')} {record.lotNumber}
                            </span>
                          )}
                          {record.status && (
                            <span className="capitalize">{record.status}</span>
                          )}
                        </p>
                      )}
                      {record.summary && (
                        <p className="mt-1.5 whitespace-pre-line text-xs leading-5 text-gray-600">
                          {record.summary}
                        </p>
                      )}
                      {/* Gate the mount rather than lean on the component's own
                          check: a synced dose should not pay for the linked-file
                          lookup ManualRecordActions runs on every record. */}
                      {isManualRecord(record.document) && (
                        <ManualRecordActions item={record.document} />
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-gray-600">
          {t(
            'Immunizations will appear here once they are added manually or synced from a patient portal.',
          )}
        </p>
      )}
    </section>
  );
}
