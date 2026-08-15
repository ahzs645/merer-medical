import { useMemo, useState } from 'react';
import {
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/20/solid';
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

type SortKey = 'default' | 'name' | 'value';
type SortDir = 'asc' | 'desc';

function numericValue(reading: ObservationReading): number {
  const match = (reading.value || '').match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : Number.NaN;
}

/**
 * Compact, read-only table of observation values — reused by the document
 * detail page and anywhere a list of results needs a scannable value/range
 * view (without the timeline row's graphing and pinning weight). Supports
 * column sorting and an optional abnormal-only filter.
 */
export function ObservationResultsTable({
  items,
  abnormalOnly = false,
}: {
  items: ClinicalDocument[];
  abnormalOnly?: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const rows = useMemo(() => {
    const readings = items.map((item) => ({
      item,
      reading: readObservation(item),
    }));
    const filtered = abnormalOnly
      ? readings.filter((r) => r.reading.abnormal)
      : readings;
    if (sortKey === 'default') return filtered;
    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === 'name') {
        return a.reading.name.localeCompare(b.reading.name);
      }
      const av = numericValue(a.reading);
      const bv = numericValue(b.reading);
      const aNan = Number.isNaN(av);
      const bNan = Number.isNaN(bv);
      if (aNan && bNan) return 0;
      if (aNan) return 1; // non-numeric values sort last
      if (bNan) return -1;
      return av - bv;
    });
    return sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [items, abnormalOnly, sortKey, sortDir]);

  const toggleSort = (key: Exclude<SortKey, 'default'>) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey('default');
    }
  };

  if (items.length === 0) return null;
  if (rows.length === 0) {
    return (
      <p className="px-1 py-2 text-sm text-gray-500">
        No abnormal results in this panel.
      </p>
    );
  }

  const SortIcon = ({ col }: { col: Exclude<SortKey, 'default'> }) => {
    if (sortKey !== col)
      return <ChevronUpDownIcon className="h-3.5 w-3.5 text-gray-300" />;
    return sortDir === 'asc' ? (
      <ChevronUpIcon className="h-3.5 w-3.5 text-gray-500" />
    ) : (
      <ChevronDownIcon className="h-3.5 w-3.5 text-gray-500" />
    );
  };

  return (
    <div className="overflow-hidden rounded-md border border-gray-200">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead className="bg-gray-50 text-start text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-3 py-2">
              <button
                type="button"
                onClick={() => toggleSort('name')}
                className="inline-flex items-center gap-1 hover:text-gray-700"
              >
                Measurement
                <SortIcon col="name" />
              </button>
            </th>
            <th className="px-3 py-2">
              <button
                type="button"
                onClick={() => toggleSort('value')}
                className="inline-flex items-center gap-1 hover:text-gray-700"
              >
                Value
                <SortIcon col="value" />
              </button>
            </th>
            <th className="hidden px-3 py-2 sm:table-cell">Reference range</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(({ item, reading }) => (
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
                    className={`ms-2 rounded px-1.5 py-0.5 text-xs font-medium ${
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
          ))}
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
