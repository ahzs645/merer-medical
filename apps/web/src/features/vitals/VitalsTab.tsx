import { useEffect, useMemo, useState } from 'react';
import { HeartIcon } from '@heroicons/react/24/outline';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { Routes as AppRoutes } from '../../Routes';
import { AppPage } from '../../shared/components/AppPage';
import { ErrorPanel } from '../../shared/components/StatusPanel';
import {
  RecordHeaderLink,
  RecordPageHeader,
} from '../../shared/components/records/RecordPageHeader';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { useRecordChangeTick } from '../../shared/utils/recordChangeSignal';
import { buildAddRecordPath } from '../manual-entry/addRecordPath';
import { isVitalSignObservation } from './utils/vitalRecords';

// Saving lands back here rather than on the Timeline: a reading you typed on
// the Vitals page belongs in front of you on the Vitals page.
const ADD_VITAL_PATH = buildAddRecordPath({
  type: 'vital',
  returnTo: AppRoutes.Vitals,
});

interface Reading {
  date?: string;
  /** Human-readable value, e.g. "112/70 mmHg" or "96 %". */
  text: string;
  /** Numeric value used for the sparkline (systolic for blood pressure). */
  numeric?: number;
}

interface VitalGroup {
  key: string;
  name: string;
  unit?: string;
  readings: Reading[];
  latest: Reading;
}

type FhirComponent = {
  code?: { coding?: Array<{ code?: string }>; text?: string };
  valueQuantity?: { value?: number; unit?: string };
};

type FhirObservation = {
  code?: { coding?: Array<{ code?: string; display?: string }>; text?: string };
  effectiveDateTime?: string;
  valueQuantity?: { value?: number; unit?: string };
  valueString?: string;
  component?: FhirComponent[];
};

const UCUM_SUPERSCRIPTS: Record<string, string> = { '2': '²', '3': '³' };

/**
 * UCUM spells exponents inline (`kg/m2`, `m2`), which renders as a literal
 * "kg/m2" in the largest text on the vitals card. Swap a trailing 2/3 that
 * follows a letter for the real superscript character — "kg/m²".
 */
function formatUnit(unit: string): string {
  return unit.replace(
    /([a-zA-Z])([23])(?![0-9a-zA-Z])/g,
    (_match, letter: string, digit: string) =>
      `${letter}${UCUM_SUPERSCRIPTS[digit]}`,
  );
}

/** Extracts a display value + sparkline number from a vital Observation, with
 * special handling for blood pressure (systolic/diastolic components). */
function readObservation(resource: FhirObservation): {
  text: string;
  numeric?: number;
  unit?: string;
} {
  const components = resource.component || [];
  const findComponent = (loinc: string) =>
    components.find((c) =>
      (c.code?.coding || []).some((coding) => coding.code === loinc),
    )?.valueQuantity;
  const systolic = findComponent('8480-6');
  const diastolic = findComponent('8462-4');
  if (systolic?.value != null || diastolic?.value != null) {
    const unit = formatUnit(systolic?.unit || diastolic?.unit || 'mmHg');
    return {
      text: `${systolic?.value ?? '–'}/${diastolic?.value ?? '–'} ${unit}`.trim(),
      numeric: systolic?.value,
      unit,
    };
  }
  if (resource.valueQuantity?.value != null) {
    const { value } = resource.valueQuantity;
    const unit = resource.valueQuantity.unit
      ? formatUnit(resource.valueQuantity.unit)
      : undefined;
    return {
      text: unit ? `${value} ${unit}` : `${value}`,
      numeric: value,
      unit,
    };
  }
  if (resource.valueString) return { text: resource.valueString };
  // Fall back to the first numeric component.
  const firstComponent = components.find((c) => c.valueQuantity?.value != null);
  if (firstComponent?.valueQuantity?.value != null) {
    const { value } = firstComponent.valueQuantity;
    const unit = firstComponent.valueQuantity.unit
      ? formatUnit(firstComponent.valueQuantity.unit)
      : undefined;
    return {
      text: unit ? `${value} ${unit}` : `${value}`,
      numeric: value,
      unit,
    };
  }
  return { text: '—' };
}

function useVitals() {
  const db = useRxDb();
  const user = useUser();
  const [groups, setGroups] = useState<VitalGroup[]>([]);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [error, setError] = useState<Error | null>(null);
  // Refetch when a manual record is added, edited, or deleted: without it a
  // vital added from this page's own button never appeared until a reload.
  const recordChangeTick = useRecordChangeTick();

  useEffect(() => {
    let mounted = true;
    async function load() {
      // Only a first load blanks the page. Flipping back to `loading` on every
      // record change swapped the whole list for the placeholder, unmounting
      // the cards — and closing any history someone had opened — each time a
      // vital was added from this page's own button.
      setStatus((current) => (current === 'success' ? current : 'loading'));
      setError(null);
      const docs = await db.clinical_documents
        .find({
          selector: {
            user_id: user.id,
            'data_record.resource_type': 'observation',
          },
        })
        .exec();
      if (!mounted) return;

      const byKey = new Map<string, VitalGroup>();
      for (const doc of docs) {
        const d = doc.toMutableJSON() as ClinicalDocument;
        if (!isVitalSignObservation(d)) continue;
        const resource = getFhirResource<FhirObservation>(d);
        if (!resource) continue;
        const loinc = resource.code?.coding?.[0]?.code;
        const name =
          resource.code?.text ||
          resource.code?.coding?.[0]?.display ||
          d.metadata?.display_name ||
          'Vital';
        const key = loinc || name.toLowerCase();
        const value = readObservation(resource);
        const reading: Reading = {
          date: resource.effectiveDateTime || d.metadata?.date,
          text: value.text,
          numeric: value.numeric,
        };
        const existing = byKey.get(key);
        if (existing) {
          existing.readings.push(reading);
          if (!existing.unit) existing.unit = value.unit;
        } else {
          byKey.set(key, {
            key,
            name,
            unit: value.unit,
            readings: [reading],
            latest: reading,
          });
        }
      }

      const list = Array.from(byKey.values());
      for (const group of list) {
        group.readings.sort((a, b) =>
          (b.date || '').localeCompare(a.date || ''),
        );
        group.latest = group.readings[0];
      }
      list.sort((a, b) => a.name.localeCompare(b.name));
      setGroups(list);
      setStatus('success');
    }
    load().catch((e) => {
      if (!mounted) return;
      setError(e instanceof Error ? e : new Error(String(e)));
      setStatus('error');
    });
    return () => {
      mounted = false;
    };
  }, [db, user.id, recordChangeTick]);

  return { groups, status, error };
}

/** Tiny dependency-free SVG sparkline of a vital's recent numeric values. */
function Sparkline({ readings }: { readings: Reading[] }) {
  const points = readings
    .filter((r) => typeof r.numeric === 'number')
    .slice(0, 12)
    .reverse()
    .map((r) => r.numeric as number);
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const width = 120;
  const height = 32;
  const step = width / (points.length - 1);
  const path = points
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="text-primary-500"
      aria-hidden="true"
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Names the trigger by what it opens and how much of it: "Show more" would not
 * say whether one row or twelve are hidden under it.
 */
function earlierReadingsLabel(count: number): string {
  return `${count} earlier ${count === 1 ? 'reading' : 'readings'}`;
}

export function VitalsTab() {
  const { groups, status, error } = useVitals();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((group) => group.name.toLowerCase().includes(q));
  }, [groups, query]);

  return (
    <AppPage
      banner={
        <RecordPageHeader
          title="Vital signs"
          search={{
            query,
            onChange: setQuery,
            placeholder: 'Search vital signs',
          }}
          // Vitals was one of six browsable categories with no way in, which is
          // why nobody discovers that a reading can be typed by hand at all.
          action={
            <RecordHeaderLink
              to={ADD_VITAL_PATH}
              label="Add vital sign"
              compact
            />
          }
        />
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-3xl gap-3 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          {status === 'loading' ? (
            <Placeholder text="Loading vital signs…" />
          ) : status === 'error' ? (
            <ErrorPanel error={error} text="Unable to load vital signs." />
          ) : groups.length === 0 ? (
            <Placeholder text="No vital signs recorded yet." icon />
          ) : filtered.length === 0 ? (
            <Placeholder text="No vital signs match this search." />
          ) : (
            filtered.map((group) => (
              <article
                key={group.key}
                className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-semibold text-gray-900">
                      {group.name}
                    </h3>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-primary-700 text-2xl font-bold">
                        {group.latest.text}
                      </span>
                      {group.latest.date && (
                        <span className="text-xs text-gray-500">
                          {safeFormatDate(group.latest.date, 'PP', '')}
                        </span>
                      )}
                    </div>
                  </div>
                  <Sparkline readings={group.readings} />
                </div>

                {/* Six dated rows a card, three cards: the history alone filled
                    a phone screen before you reached the third vital, and the
                    sparkline above already says which way it is going. Native
                    <details> rather than a state-holding disclosure — the browser gives the
                    button semantics, the expanded state and the keyboard — with
                    the summary left a list-item, because a flex summary drops
                    the triangle in Chrome. */}
                {group.readings.length > 1 && (
                  <details className="mt-3 border-t border-gray-100">
                    <summary
                      className="text-primary-700 hover:text-primary-800 min-h-[44px] cursor-pointer py-3 text-xs font-semibold"
                      // Every card offers the same phrase, so the spoken name
                      // adds the vital — as a suffix, so the visible label is
                      // still the start of it.
                      aria-label={`${earlierReadingsLabel(
                        group.readings.length - 1,
                      )} for ${group.name}`}
                    >
                      {earlierReadingsLabel(group.readings.length - 1)}
                    </summary>
                    <table className="w-full text-xs text-gray-600">
                      <tbody>
                        {/* From the second reading down: the newest is the
                            headline above. The old 6-row cap goes with it —
                            it bounded a list that was always open, and here it
                            would only hide readings someone opened the list to
                            find. */}
                        {group.readings.slice(1).map((reading, index) => (
                          <tr
                            key={index}
                            className="border-b border-gray-50 last:border-0"
                          >
                            <td className="py-1 pr-2 text-gray-500">
                              {reading.date
                                ? safeFormatDate(reading.date, 'PP', '')
                                : '—'}
                            </td>
                            <td className="py-1 text-right font-medium text-gray-800">
                              {reading.text}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                )}
              </article>
            ))
          )}
        </div>
      </div>
    </AppPage>
  );
}

function Placeholder({ text, icon }: { text: string; icon?: boolean }) {
  return (
    <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
      {icon && (
        <div className="bg-primary-50 text-primary-700 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
          <HeartIcon className="h-6 w-6" />
        </div>
      )}
      {text}
    </div>
  );
}
