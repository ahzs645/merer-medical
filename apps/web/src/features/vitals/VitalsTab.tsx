import { useState, useEffect, useMemo } from 'react';
import { HeartIcon } from '@heroicons/react/24/outline';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
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
import { ManualRecordActions } from '../manual-entry/ManualRecordActions';
import { isVitalSignObservation } from './utils/vitalRecords';
import { useListViewParams } from '../../shared/hooks/useListViewParams';
import { splitClinicalNote } from '../../shared/utils/clinicalNotes';

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
  /**
   * The record this reading was read out of.
   *
   * A number on its own is not a result — "96 %" means one thing from a clinic
   * pulse oximeter and another from a home device, and a reading you cannot
   * trace is a reading you cannot check. Carrying the document lets each one
   * offer the same View source the rest of the app offers.
   */
  document: ClinicalDocument;
  /** Where it came from, for the line under the value. */
  source?: string;
  /** Anything the source said about the reading — position, method, cuff size. */
  notes: string[];
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
  note?: Array<{ text?: string }> | { text?: string };
  bodySite?: { text?: string };
  method?: { text?: string };
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
      const [docs, connectionDocs] = await Promise.all([
        db.clinical_documents
          .find({
            selector: {
              user_id: user.id,
              'data_record.resource_type': 'observation',
            },
          })
          .exec(),
        // Which document a reading came from is half of what makes it
        // readable, and the FHIR resource does not carry the name — the
        // connection does. A name is a nicety though, so a failure here costs
        // the label and not the page: without the catch, one rejected query
        // blanks every vital the user has.
        db.connection_documents
          ?.find({ selector: { user_id: user.id } })
          .exec()
          .catch(() => []) ?? [],
      ]);
      if (!mounted) return;
      const connectionsById = new Map<string, ConnectionDocument>(
        connectionDocs.map((c) => [
          c.id,
          c.toMutableJSON() as ConnectionDocument,
        ]),
      );

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
        const rawNotes = Array.isArray(resource.note)
          ? resource.note
          : resource.note
            ? [resource.note]
            : [];
        const reading: Reading = {
          date: resource.effectiveDateTime || d.metadata?.date,
          text: value.text,
          numeric: value.numeric,
          document: d,
          source:
            connectionsById.get(d.connection_record_id)?.name ||
            d.metadata?.source_name,
          notes: [
            resource.bodySite?.text
              ? `Site: ${resource.bodySite.text}`
              : undefined,
            resource.method?.text
              ? `Method: ${resource.method.text}`
              : undefined,
            ...rawNotes.flatMap((note) => splitClinicalNote(note?.text)),
          ].filter((note): note is string => Boolean(note)),
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

/**
 * Tiny dependency-free SVG sparkline of a vital's recent numeric values.
 *
 * Returns nothing for a single reading: one point is not a trend, and a flat
 * stub next to a first-ever measurement suggests a history that is not there.
 * Qualitative vitals ("Normal", "Just under normal range") have no numbers to
 * plot and fall out here too.
 *
 * Each point carries a `<title>`, so hovering or focusing a dot names its date
 * and value without a charting library or a tooltip of our own.
 */
function Sparkline({ readings, name }: { readings: Reading[]; name: string }) {
  const plotted = readings
    .filter((r) => typeof r.numeric === 'number')
    .slice(0, 12)
    .reverse();
  if (plotted.length < 2) return null;

  const points = plotted.map((r) => r.numeric as number);
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const width = 120;
  const height = 32;
  const step = width / (points.length - 1);
  const positions = points.map((value, index) => ({
    x: index * step,
    y: height - ((value - min) / range) * (height - 6) - 3,
  }));
  const path = positions
    .map(
      (p, index) =>
        `${index === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`,
    )
    .join(' ');
  const first = plotted[0];
  const last = plotted[plotted.length - 1];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="text-primary-500 overflow-visible"
      role="img"
      aria-label={`${name}: ${plotted.length} readings, ${first.text} on ${safeFormatDate(first.date, 'PP', 'an earlier date')} to ${last.text} on ${safeFormatDate(last.date, 'PP', 'the latest date')}`}
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {positions.map((p, index) => (
        <circle
          key={index}
          cx={p.x}
          cy={p.y}
          // The latest reading is the one the headline shows, so it is the one
          // worth finding on the line.
          r={index === positions.length - 1 ? 2.75 : 1.75}
          fill="currentColor"
        >
          <title>
            {`${plotted[index].text}${
              plotted[index].date
                ? ` on ${safeFormatDate(plotted[index].date, 'PP', '')}`
                : ''
            }`}
          </title>
        </circle>
      ))}
    </svg>
  );
}

/**
 * One reading, opened up: where it came from, what the source said about it,
 * and the same actions every other record offers.
 *
 * The history was a date and a number per row, which is enough to see a trend
 * and not enough to check one. A reading that disagrees with the others is
 * exactly the one you want to trace back to its document.
 */
function ReadingDetail({ reading }: { reading: Reading }) {
  return (
    <div className="px-1 pb-2">
      {reading.source && (
        <p className="text-xs text-gray-500">{reading.source}</p>
      )}
      {reading.notes.map((note, index) => (
        <p key={index} className="mt-1 text-xs text-gray-600">
          {note}
        </p>
      ))}
      <ManualRecordActions item={reading.document} />
    </div>
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
  // Search lives in the URL, so the view survives Back, can be linked, and
  // comes back the same length it left — see useListViewParams.
  const { query, setQuery } = useListViewParams();

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
                    <h2 className="break-words text-sm font-semibold text-gray-900">
                      {group.name}
                    </h2>
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
                  <Sparkline readings={group.readings} name={group.name} />
                </div>

                {/* Six dated rows a card, three cards: the history alone filled
                    a phone screen before you reached the third vital, and the
                    sparkline above already says which way it is going. Native
                    <details> rather than a state-holding disclosure — the browser gives the
                    button semantics, the expanded state and the keyboard — with
                    the summary left a list-item, because a flex summary drops
                    the triangle in Chrome. */}
                {/* The reading in the headline is a record like any other, and
                    until now it was the only one on the page you could not
                    trace: the actions row existed on Allergies, Conditions and
                    Medications cards but not here. */}
                <ManualRecordActions item={group.latest.document} />

                {group.readings.length > 1 && (
                  <details className="-mb-4 mt-3 border-t border-gray-100">
                    <summary
                      // 14px of padding around a 16px line is the 44px target exactly. With
                      // `py-3` + `min-h-[44px]` the 4px of slack all fell below the
                      // text, and the card's own 16px of padding fell under that:
                      // 32px of white under the label against 12px above it.
                      className="text-primary-700 hover:text-primary-800 cursor-pointer py-3.5 text-xs font-semibold"
                      // Every card offers the same phrase, so the spoken name
                      // adds the vital — as a suffix, so the visible label is
                      // still the start of it.
                      aria-label={`${earlierReadingsLabel(
                        group.readings.length - 1,
                      )} for ${group.name}`}
                    >
                      {earlierReadingsLabel(group.readings.length - 1)}
                    </summary>
                    <ul className="mb-4 w-full text-xs text-gray-600">
                      {/* From the second reading down: the newest is the
                            headline above. The old 6-row cap goes with it —
                            it bounded a list that was always open, and here it
                            would only hide readings someone opened the list to
                            find. */}
                      {group.readings.slice(1).map((reading, index) => (
                        <li
                          key={index}
                          className="border-b border-gray-50 last:border-0"
                        >
                          {/* Nested <details> again rather than a selected-row
                                panel: the browser supplies the button, the
                                expanded state and the keyboard, and two readings
                                can be open side by side for comparison. */}
                          <details>
                            <summary className="flex cursor-pointer list-none items-baseline justify-between gap-2 py-1.5">
                              <span className="text-gray-500">
                                {reading.date
                                  ? safeFormatDate(reading.date, 'PP', '')
                                  : '—'}
                              </span>
                              <span className="font-medium text-gray-800">
                                {reading.text}
                              </span>
                            </summary>
                            <ReadingDetail reading={reading} />
                          </details>
                        </li>
                      ))}
                    </ul>
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
