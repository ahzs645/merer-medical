import { useEffect, useMemo, useState } from 'react';
import {
  BuildingOffice2Icon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
import { AppPage } from '../../shared/components/AppPage';
import { GenericBanner } from '../../shared/components/GenericBanner';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { getEncounterLocation } from '../../shared/utils/fhirAccessHelpers';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { firstText, periodStart } from '../../shared/utils/fhirText';

// Resource types we treat as "records" when counting same-day activity.
const SAME_DAY_RESOURCE_TYPES = new Set<string>([
  'observation',
  'diagnosticreport',
  'procedure',
  'medicationstatement',
  'immunization',
  'condition',
]);

interface ParsedLocation {
  name?: string;
  address?: string;
  phone?: string;
}

/**
 * Best-effort split of a single concatenated location display string into
 * { name, address, phone }. Defensive: never throws, and falls back to
 * returning the raw string as `name` when parsing is uncertain.
 *
 * Example input:
 *   "Jasper Healthcare Centre Lab/DI 518 Robson Street Jasper, AB T0E 1E0 780-852-6606"
 */
function parseLocation(display: string): ParsedLocation {
  try {
    const raw = (display || '').trim();
    if (!raw) return {};

    let rest = raw;

    // Extract a trailing North-American phone number without swallowing the
    // trailing digit of a preceding postal code (e.g. "T0E 1E0 780-852-6606").
    let phone: string | undefined;
    const phoneMatch = rest.match(
      /(\+?1[\s.-]?)?(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})\s*$/,
    );
    if (phoneMatch && phoneMatch.index !== undefined) {
      phone = phoneMatch[0].trim();
      rest = rest.slice(0, phoneMatch.index).trim();
    }

    // Find where the "name" ends and the "address" begins. We treat the first
    // digit-led address token (e.g. a street number) or a known facility-type
    // marker (e.g. "Lab/DI") as the start of the address portion.
    let splitIndex = -1;

    const markerMatch = rest.match(/\bLab\/DI\b/i);
    if (markerMatch && markerMatch.index !== undefined) {
      splitIndex = markerMatch.index;
    }

    const numberMatch = rest.match(/\b\d/);
    if (numberMatch && numberMatch.index !== undefined) {
      if (splitIndex === -1 || numberMatch.index < splitIndex) {
        splitIndex = numberMatch.index;
      }
    }

    let name: string | undefined;
    let address: string | undefined;
    if (splitIndex > 0) {
      name = rest.slice(0, splitIndex).trim();
      address = rest.slice(splitIndex).trim() || undefined;
    } else {
      name = rest || undefined;
    }

    // If we couldn't pull out a meaningful name, fall back to the raw string.
    if (!name) {
      return { name: raw };
    }

    return { name, address, phone };
  } catch {
    return { name: display };
  }
}

interface EncounterItem {
  id: string;
  title: string;
  date?: string;
  classDisplay?: string;
  location?: string;
  reason?: string;
  sameDayCount: number;
  source?: string;
}

function useEncounters() {
  const db = useRxDb();
  const user = useUser();
  const [items, setItems] = useState<EncounterItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setStatus('loading');
      const [encounterDocs, allDocs, connectionDocs] = await Promise.all([
        db.clinical_documents
          .find({
            selector: {
              user_id: user.id,
              'data_record.resource_type': 'encounter',
            },
          })
          .exec(),
        db.clinical_documents.find({ selector: { user_id: user.id } }).exec(),
        db.connection_documents.find({ selector: { user_id: user.id } }).exec(),
      ]);
      if (!mounted) return;

      const connById = new Map(
        connectionDocs.map((d) => {
          const c = d.toMutableJSON() as ConnectionDocument;
          return [c.id, c] as const;
        }),
      );

      // Count, per calendar day, how many "records" (non-encounter resource
      // types of interest) happened. This is a DATE-BASED association only —
      // the underlying data has no encounter references.
      const recordsByDay = new Map<string, number>();
      for (const row of allDocs) {
        const d = row.toMutableJSON() as ClinicalDocument;
        const resourceType = d.data_record?.resource_type;
        if (!resourceType || !SAME_DAY_RESOURCE_TYPES.has(resourceType)) {
          continue;
        }
        const day = (d.metadata?.date || '').slice(0, 10);
        if (!day) continue;
        recordsByDay.set(day, (recordsByDay.get(day) || 0) + 1);
      }

      const list = encounterDocs.map((doc) => {
        const d = doc.toMutableJSON() as ClinicalDocument;
        const r = getFhirResource<Record<string, unknown>>(d);
        const classDisplay = firstText(
          (r['class'] as Record<string, unknown>)?.['display'],
        );
        const date = periodStart(r['period']) || d.metadata?.date;
        const day = (date || '').slice(0, 10);
        return {
          id: d.id,
          title: d.metadata?.display_name || classDisplay || 'Encounter',
          date,
          classDisplay,
          location: getEncounterLocation(d),
          reason: firstText((r['reasonCode'] as unknown[] | undefined)?.[0]),
          // Same-day count of OTHER records (encounters aren't counted above).
          sameDayCount: day ? recordsByDay.get(day) || 0 : 0,
          source:
            connById.get(d.connection_record_id)?.name ||
            d.metadata?.source_name,
        };
      });
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setItems(list);
      setStatus('success');
    }
    load();
    return () => {
      mounted = false;
    };
  }, [db, user.id]);

  return { items, status };
}

export function EncountersTab() {
  const { items, status } = useEncounters();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.title, item.location, item.source]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [items, query]);

  return (
    <AppPage banner={<GenericBanner text="Encounters" />}>
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-3xl gap-3 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          <label className="relative block">
            <span className="sr-only">Search encounters</span>
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search encounters"
              className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </label>

          {status === 'loading' ? (
            <Placeholder text="Loading encounters…" />
          ) : items.length === 0 ? (
            <Placeholder text="No visits or encounters recorded yet." icon />
          ) : filtered.length === 0 ? (
            <Placeholder text="No encounters match this search." />
          ) : (
            filtered.map((item) => {
              const parsed = item.location
                ? parseLocation(item.location)
                : undefined;
              return (
                <article
                  key={item.id}
                  className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-sm font-semibold text-gray-900">
                        {item.title}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        {item.classDisplay && (
                          <span className="capitalize">
                            {item.classDisplay}
                          </span>
                        )}
                        {item.source && <span>· {item.source}</span>}
                      </div>
                    </div>
                    {item.date && (
                      <span className="shrink-0 text-sm text-gray-500">
                        {safeFormatDate(item.date, 'PP', '')}
                      </span>
                    )}
                  </div>

                  {parsed &&
                    (parsed.name || parsed.address || parsed.phone) && (
                      <div className="mt-2 text-xs">
                        {parsed.name && (
                          <p className="font-medium text-gray-700">
                            {parsed.name}
                          </p>
                        )}
                        {parsed.address && (
                          <p className="text-gray-500">{parsed.address}</p>
                        )}
                        {parsed.phone && (
                          <p className="text-gray-500">{parsed.phone}</p>
                        )}
                      </div>
                    )}

                  {item.reason && (
                    <p className="mt-2 break-words text-xs text-gray-600">
                      {item.reason}
                    </p>
                  )}

                  {item.sameDayCount > 0 && (
                    <span className="mt-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      {item.sameDayCount} same-day record
                      {item.sameDayCount === 1 ? '' : 's'}
                    </span>
                  )}
                </article>
              );
            })
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
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-700">
          <BuildingOffice2Icon className="h-6 w-6" />
        </div>
      )}
      {text}
    </div>
  );
}
