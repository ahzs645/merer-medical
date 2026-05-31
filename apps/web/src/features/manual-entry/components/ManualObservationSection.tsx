import { StylizedSelect } from '../../../shared/components/StylizedSelect';
import {
  type ManualObservationAbsentReason,
  type ManualObservationValueKind,
} from '../clinicalTerminology';
import type { ManualRecordFormController } from '../hooks/useManualRecordForm';
import { ManualLabRowsSection } from './ManualLabRowsSection';

export function ManualObservationSection({
  form,
}: {
  form: ManualRecordFormController;
}) {
  const {
    t,
    isObservationType,
    isDeviceImportType,
    recordType,
    isEditing,
    valueKind,
    setValueKind,
    comparator,
    setComparator,
    absentReason,
    setAbsentReason,
    value,
    setValue,
    unit,
    setUnit,
    rangeLow,
    setRangeLow,
    rangeHigh,
    setRangeHigh,
    rangeText,
    setRangeText,
    interpretation,
    setInterpretation,
  } = form;

  return isObservationType && !isDeviceImportType ? (
    <div className="grid gap-4 sm:grid-cols-2">
      {recordType === 'lab' && !isEditing && (
        <ManualLabRowsSection form={form} />
      )}

      {recordType === 'lab' && !isEditing ? null : (
        <>
          <div>
            <label
              htmlFor="manual-record-value-kind"
              className="block text-sm font-semibold text-gray-900"
            >
              {t('Value type')}
            </label>
            <StylizedSelect
              id="manual-record-value-kind"
              value={valueKind}
              onChange={(value) =>
                setValueKind(value as ManualObservationValueKind)
              }
              className="mt-2"
              buttonClassName="text-base"
              options={[
                { value: 'quantity', label: t('Quantity') },
                { value: 'string', label: t('Text') },
                { value: 'coded', label: t('Coded') },
                { value: 'absent', label: t('Absent') },
              ]}
            />
          </div>

          <div>
            <label
              htmlFor="manual-record-comparator"
              className="block text-sm font-semibold text-gray-900"
            >
              {t('Comparator')}
            </label>
            <StylizedSelect
              id="manual-record-comparator"
              value={comparator}
              disabled={valueKind !== 'quantity'}
              onChange={setComparator}
              className="mt-2"
              buttonClassName="text-base"
              options={[
                { value: '', label: '=' },
                { value: '<', label: '<' },
                { value: '<=', label: '<=' },
                { value: '>', label: '>' },
                { value: '>=', label: '>=' },
              ]}
            />
          </div>

          <div>
            <label
              htmlFor="manual-record-value"
              className="block text-sm font-semibold text-gray-900"
            >
              {t('Value')}
            </label>
            {valueKind === 'absent' ? (
              <StylizedSelect
                id="manual-record-value"
                value={absentReason}
                onChange={(value) =>
                  setAbsentReason(value as ManualObservationAbsentReason)
                }
                className="mt-2"
                buttonClassName="text-base"
                options={[
                  { value: 'pending', label: t('Pending') },
                  {
                    value: 'not-performed',
                    label: t('Not performed'),
                  },
                  { value: 'unknown', label: t('Unknown') },
                  { value: 'not-applicable', label: t('N/A') },
                ]}
              />
            ) : (
              <input
                id="manual-record-value"
                type="text"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
              />
            )}
          </div>

          <div>
            <label
              htmlFor="manual-record-unit"
              className="block text-sm font-semibold text-gray-900"
            >
              {t('Unit')}
            </label>
            <input
              id="manual-record-unit"
              type="text"
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
          </div>

          <div>
            <label
              htmlFor="manual-record-range-low"
              className="block text-sm font-semibold text-gray-900"
            >
              {t('Range low')}
            </label>
            <input
              id="manual-record-range-low"
              type="text"
              value={rangeLow}
              onChange={(event) => setRangeLow(event.target.value)}
              className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
          </div>

          <div>
            <label
              htmlFor="manual-record-range-high"
              className="block text-sm font-semibold text-gray-900"
            >
              {t('Range high')}
            </label>
            <input
              id="manual-record-range-high"
              type="text"
              value={rangeHigh}
              onChange={(event) => setRangeHigh(event.target.value)}
              className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="manual-record-range-text"
              className="block text-sm font-semibold text-gray-900"
            >
              {t('Range text')}
            </label>
            <input
              id="manual-record-range-text"
              type="text"
              value={rangeText}
              placeholder={t('e.g. Negative')}
              onChange={(event) => setRangeText(event.target.value)}
              className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="manual-record-interpretation"
              className="block text-sm font-semibold text-gray-900"
            >
              {t('Interpretation')}
            </label>
            <input
              id="manual-record-interpretation"
              type="text"
              value={interpretation}
              onChange={(event) => setInterpretation(event.target.value)}
              className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-base text-gray-900 shadow-sm focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600"
            />
          </div>
        </>
      )}
    </div>
  ) : null;
}
