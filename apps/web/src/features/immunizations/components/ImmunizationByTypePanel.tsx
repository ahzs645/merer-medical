import type { VaccineGroup } from '@mere/immunization-forecast';
import { useMemo } from 'react';

import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { safeFormatDate } from '../../../shared/utils/dateFormatters';
import { ImmunizationRecord } from '../types';
import { vaccineGroupLabel } from '../utils/vaccineGroupLabels';

type VaccineTypeRow = {
  key: VaccineGroup;
  label: string;
  doses: ImmunizationRecord[];
};

function buildRows(records: ImmunizationRecord[]): VaccineTypeRow[] {
  const groups = new Map<VaccineGroup, ImmunizationRecord[]>();
  for (const record of records) {
    const existing = groups.get(record.vaccineKey);
    if (existing) {
      existing.push(record);
    } else {
      groups.set(record.vaccineKey, [record]);
    }
  }

  return Array.from(groups.entries())
    .map(([key, doses]) => ({
      key,
      // For unrecognized vaccines, prefer the record's own name over "Other".
      label:
        key === 'unknown'
          ? doses[0]?.vaccineName || vaccineGroupLabel(key)
          : vaccineGroupLabel(key),
      // Chronological (oldest first) mirrors how childhood schedules are read.
      doses: [...doses].sort((a, b) =>
        (a.date || '').localeCompare(b.date || ''),
      ),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function ImmunizationByTypePanel({
  records,
}: {
  records: ImmunizationRecord[];
}) {
  const { t } = useInterfaceLanguage();
  const rows = useMemo(() => buildRows(records), [records]);

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {t('Vaccines by type')}
          </h2>
          <p className="mt-0.5 text-sm text-gray-600">
            {t('Each dose in the order it was given.')}
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-400">
          {rows.length} {t('types')}
        </span>
      </div>

      <ul className="mt-4 divide-y divide-gray-100">
        {rows.map((row) => (
          <li key={row.key} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900">
                {t(row.label)}
              </h3>
              <span className="shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-semibold text-primary-700">
                {row.doses.length}{' '}
                {row.doses.length === 1 ? t('dose') : t('doses')}
              </span>
            </div>
            <ol className="mt-2 flex flex-wrap gap-1.5">
              {row.doses.map((dose, index) => (
                <li
                  key={dose.id}
                  className="inline-flex items-baseline gap-1.5 rounded-md bg-gray-50 px-2 py-1 text-xs ring-1 ring-inset ring-gray-200"
                >
                  <span className="font-medium text-gray-400">
                    {dose.doseNumber ?? index + 1}
                  </span>
                  <span className="font-medium text-gray-800">
                    {safeFormatDate(dose.date, 'MMM d, yyyy', t('Undated'))}
                  </span>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ul>
    </section>
  );
}
