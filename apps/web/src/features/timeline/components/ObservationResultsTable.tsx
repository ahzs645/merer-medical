import { BundleEntry, Observation } from 'fhir/r2';

import { ClinicalDocument } from '../../../models/clinical-document/ClinicalDocument.type';
import {
  getManualObservationInterpretation,
  getManualObservationRange,
  getManualObservationValue,
  isManualRecord,
} from '../../../shared/utils/manualRecordUtils';
import {
  getInterpretationText,
  getReferenceRangeString,
  getValueQuantity,
  getValueString,
  getValueUnit,
  isOutOfRangeResult,
} from '../utils/fhirpathParsers';

type ObservationDoc = ClinicalDocument<BundleEntry<Observation>>;

const ABNORMAL_RE =
  /\b(high|low|abnormal|critical|positive|reactive|elevated|out of range|detected)\b/i;

export type ObservationReading = {
  name: string;
  value?: string;
  range?: string;
  interpretation?: string;
  abnormal: boolean;
};

/** Pull a display value/range/interpretation from either a manual record or a
 * standard FHIR observation, so the same table works for both. */
export function readObservation(item: ClinicalDocument): ObservationReading {
  const manual = isManualRecord(item);
  const typed = item as ObservationDoc;

  let value = manual ? getManualObservationValue(item) : undefined;
  if (!value) {
    const quantity = getValueQuantity(typed);
    const unit = getValueUnit(typed);
    value =
      quantity !== undefined
        ? `${quantity}${unit ? ` ${unit}` : ''}`
        : getValueString(typed) || undefined;
  }

  const range =
    (manual ? getManualObservationRange(item) : undefined) ||
    getReferenceRangeString(typed) ||
    undefined;

  const interpretation =
    (manual ? getManualObservationInterpretation(item) : undefined) ||
    getInterpretationText(typed) ||
    undefined;

  let abnormal = false;
  try {
    abnormal = isOutOfRangeResult(typed);
  } catch {
    abnormal = false;
  }
  if (!abnormal && interpretation && ABNORMAL_RE.test(interpretation)) {
    if (!/\bnormal\b/i.test(interpretation)) abnormal = true;
  }

  return {
    name: item.metadata?.display_name || 'Result',
    value,
    range,
    interpretation,
    abnormal,
  };
}

/**
 * Compact, read-only table of observation values — reused by the document
 * detail page and anywhere a list of results needs a scannable value/range
 * view (without the timeline row's graphing and pinning weight).
 */
export function ObservationResultsTable({
  items,
}: {
  items: ClinicalDocument[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-md border border-gray-200">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-3 py-2">Measurement</th>
            <th className="px-3 py-2">Value</th>
            <th className="hidden px-3 py-2 sm:table-cell">Reference range</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => {
            const reading = readObservation(item);
            return (
              <tr key={item.id} className={reading.abnormal ? 'bg-red-50' : ''}>
                <td className="px-3 py-2 align-top font-medium text-gray-800">
                  {reading.name}
                </td>
                <td className="px-3 py-2 align-top">
                  <span
                    className={`font-semibold ${
                      reading.abnormal ? 'text-red-700' : 'text-gray-900'
                    }`}
                  >
                    {reading.value || '—'}
                  </span>
                  {reading.interpretation && (
                    <span
                      className={`ml-2 rounded px-1.5 py-0.5 text-xs font-medium ${
                        reading.abnormal
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {reading.interpretation}
                    </span>
                  )}
                  {reading.range && (
                    <div className="text-xs text-gray-500 sm:hidden">
                      Range: {reading.range}
                    </div>
                  )}
                </td>
                <td className="hidden px-3 py-2 align-top text-xs text-gray-500 sm:table-cell">
                  {reading.range || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** How many of the given observation docs read as out-of-range / abnormal. */
export function countAbnormal(items: ClinicalDocument[]): number {
  return items.reduce(
    (total, item) => (readObservation(item).abnormal ? total + 1 : total),
    0,
  );
}
