import {
  LabResultRow,
  ManualObservationAbsentReason,
  ManualObservationValueKind,
  TerminologyEntry,
} from './clinicalTerminology';
import { TerminologyCombobox, UnitInput } from './TerminologyCombobox';
import {
  TerminologyLanguage,
  TerminologyLookupMode,
  TerminologyProfile,
} from '@mere/domain';
import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';

export function LabResultsTable({
  rows,
  submitAttempted,
  completedRowCount,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
  onSelectTerminology,
  profile,
  language,
  lookupMode,
  remoteEnabled,
}: {
  rows: LabResultRow[];
  submitAttempted: boolean;
  completedRowCount: number;
  profile: TerminologyProfile;
  language: TerminologyLanguage;
  lookupMode: TerminologyLookupMode;
  remoteEnabled: boolean;
  onAddRow: () => void;
  onRemoveRow: (rowId: string) => void;
  onUpdateRow: (
    rowId: string,
    patch: Partial<Omit<LabResultRow, 'id'>>,
  ) => void;
  onSelectTerminology: (rowId: string, entry: TerminologyEntry) => void;
}) {
  const { t } = useInterfaceLanguage();

  return (
    <div className="sm:col-span-2">
      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-start text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2">{t('Test')}</th>
              <th className="px-3 py-2">{t('Kind')}</th>
              <th className="px-3 py-2">{t('Sign')}</th>
              <th className="px-3 py-2">{t('Value')}</th>
              <th className="px-3 py-2">{t('Unit')}</th>
              <th className="px-3 py-2">{t('Low')}</th>
              <th className="px-3 py-2">{t('High')}</th>
              <th className="px-3 py-2">{t('Range text')}</th>
              <th className="px-3 py-2">{t('Flag')}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="min-w-56 px-3 py-2 align-top">
                  <TerminologyCombobox
                    id={`manual-lab-title-${row.id}`}
                    kind="lab"
                    value={row.title}
                    placeholder={t('e.g. Hemoglobin A1c')}
                    profile={profile}
                    language={language}
                    lookupMode={lookupMode}
                    remoteEnabled={remoteEnabled}
                    onValueChange={(nextValue) =>
                      onUpdateRow(row.id, {
                        title: nextValue,
                        terminology: undefined,
                      })
                    }
                    onSelect={(entry) => onSelectTerminology(row.id, entry)}
                  />
                </td>
                <td className="w-32 px-3 py-2 align-top">
                  <select
                    value={row.valueKind}
                    onChange={(event) =>
                      onUpdateRow(row.id, {
                        valueKind: event.target
                          .value as ManualObservationValueKind,
                      })
                    }
                    className="block w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  >
                    <option value="quantity">{t('Quantity')}</option>
                    <option value="string">{t('Text')}</option>
                    <option value="coded">{t('Coded')}</option>
                    <option value="absent">{t('Absent')}</option>
                  </select>
                </td>
                <td className="w-24 px-3 py-2 align-top">
                  <select
                    value={row.comparator}
                    disabled={row.valueKind !== 'quantity'}
                    onChange={(event) =>
                      onUpdateRow(row.id, { comparator: event.target.value })
                    }
                    className="block w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    <option value="">=</option>
                    <option value="<">&lt;</option>
                    <option value="<=">&lt;=</option>
                    <option value=">">&gt;</option>
                    <option value=">=">&gt;=</option>
                  </select>
                </td>
                <td className="w-28 px-3 py-2 align-top">
                  {row.valueKind === 'absent' ? (
                    <select
                      value={row.absentReason}
                      onChange={(event) =>
                        onUpdateRow(row.id, {
                          absentReason: event.target
                            .value as ManualObservationAbsentReason,
                        })
                      }
                      className="block w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                    >
                      <option value="pending">{t('Pending')}</option>
                      <option value="not-performed">
                        {t('Not performed')}
                      </option>
                      <option value="unknown">{t('Unknown')}</option>
                      <option value="not-applicable">{t('N/A')}</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={row.value}
                      onChange={(event) =>
                        onUpdateRow(row.id, { value: event.target.value })
                      }
                      className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                    />
                  )}
                </td>
                <td className="w-36 px-3 py-2 align-top">
                  <UnitInput
                    value={row.unit}
                    units={row.terminology?.units}
                    onChange={(nextUnit) =>
                      onUpdateRow(row.id, { unit: nextUnit })
                    }
                  />
                </td>
                <td className="w-24 px-3 py-2 align-top">
                  <input
                    type="text"
                    value={row.rangeLow}
                    onChange={(event) =>
                      onUpdateRow(row.id, { rangeLow: event.target.value })
                    }
                    className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  />
                </td>
                <td className="w-36 px-3 py-2 align-top">
                  <input
                    type="text"
                    value={row.rangeText}
                    placeholder={t('e.g. Negative')}
                    onChange={(event) =>
                      onUpdateRow(row.id, { rangeText: event.target.value })
                    }
                    className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  />
                </td>
                <td className="w-24 px-3 py-2 align-top">
                  <input
                    type="text"
                    value={row.rangeHigh}
                    onChange={(event) =>
                      onUpdateRow(row.id, { rangeHigh: event.target.value })
                    }
                    className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  />
                </td>
                <td className="w-32 px-3 py-2 align-top">
                  <input
                    type="text"
                    value={row.interpretation}
                    placeholder={t('High')}
                    onChange={(event) =>
                      onUpdateRow(row.id, {
                        interpretation: event.target.value,
                      })
                    }
                    className="block w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
                  />
                </td>
                <td className="px-3 py-2 align-top">
                  <button
                    type="button"
                    disabled={rows.length === 1}
                    onClick={() => onRemoveRow(row.id)}
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t('Remove')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={onAddRow}
        className="mt-2 rounded-md border border-primary-200 px-3 py-1.5 text-sm font-semibold text-primary-700 hover:bg-primary-50"
      >
        {t('Add lab row')}
      </button>
      {submitAttempted && completedRowCount === 0 && (
        <p className="mt-1 text-xs font-medium text-red-600">
          {t('Add at least one lab result.')}
        </p>
      )}
    </div>
  );
}
