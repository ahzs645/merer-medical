import type { VaccineGroup } from '@mere/immunization-forecast';
import { useMemo } from 'react';

import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
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
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {t('Vaccines by type')}
          </h2>
          <p className="text-sm text-gray-600">
            {t(
              'One row per vaccine, with each dose in the order it was given.',
            )}
          </p>
        </div>
        <span className="text-xs font-semibold uppercase text-gray-500">
          {rows.length} {t('types')}
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
              <th className="py-2 pr-4 font-medium">{t('Vaccine')}</th>
              <th className="py-2 pr-4 font-medium">{t('Doses')}</th>
              <th className="py-2 font-medium">{t('Dates given')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.key}
                className="border-b border-gray-100 align-top last:border-0"
              >
                <th
                  scope="row"
                  className="py-3 pr-4 text-left font-semibold text-gray-900"
                >
                  {t(row.label)}
                </th>
                <td className="py-3 pr-4 text-gray-700">{row.doses.length}</td>
                <td className="py-3">
                  <ol className="flex flex-wrap gap-1.5">
                    {row.doses.map((dose, index) => (
                      <li
                        key={dose.id}
                        className="inline-flex items-baseline gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs ring-1 ring-gray-200"
                      >
                        <span className="font-medium text-gray-500">
                          {t('Dose')} {dose.doseNumber ?? index + 1}
                        </span>
                        <span className="text-gray-900">
                          {dose.date?.split('T')[0] || t('Undated')}
                        </span>
                      </li>
                    ))}
                  </ol>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
