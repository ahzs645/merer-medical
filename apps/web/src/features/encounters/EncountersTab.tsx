import { useMemo, useState } from 'react';
import { BuildingOffice2Icon } from '@heroicons/react/24/outline';

import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
import { Badge } from '../../shared/components/Badge';
import { RecordListPage } from '../../shared/components/records/RecordListPage';
import {
  compareByDateDesc,
  useRecordList,
} from '../../shared/hooks/useRecordList';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { getEncounterLocation } from '../../shared/utils/fhirAccessHelpers';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { firstText, periodStart } from '../../shared/utils/fhirText';
import { ManualRecordActions } from '../manual-entry/ManualRecordActions';
import { FactList } from '../../shared/components/FactList';

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
  /** Kept for `ManualRecordActions`, which decides for itself whether this
   *  record was typed here or arrived from a provider. */
  document: ClinicalDocument;
  title: string;
  date?: string;
  classDisplay?: string;
  location?: string;
  reason?: string;
  sameDayCount: number;
  source?: string;
}

function mapEncounterDocs(
  docs: ClinicalDocument[],
  connectionsById: Map<string, ConnectionDocument>,
): EncounterItem[] {
  // Count, per calendar day, how many "records" (non-encounter resource
  // types of interest) happened. This is a DATE-BASED association only —
  // the underlying data has no encounter references.
  const recordsByDay = new Map<string, number>();
  for (const d of docs) {
    const resourceType = d.data_record?.resource_type;
    if (!resourceType || !SAME_DAY_RESOURCE_TYPES.has(resourceType)) {
      continue;
    }
    const day = (d.metadata?.date || '').slice(0, 10);
    if (!day) continue;
    recordsByDay.set(day, (recordsByDay.get(day) || 0) + 1);
  }

  return docs
    .filter((d) => d.data_record?.resource_type === 'encounter')
    .map((d) => {
      const r = getFhirResource<Record<string, unknown>>(d);
      const classDisplay = firstText(
        (r['class'] as Record<string, unknown>)?.['display'],
      );
      const date = periodStart(r['period']) || d.metadata?.date;
      const day = (date || '').slice(0, 10);
      return {
        id: d.id,
        document: d,
        title: d.metadata?.display_name || classDisplay || 'Encounter',
        date,
        classDisplay,
        location: getEncounterLocation(d),
        reason: firstText((r['reasonCode'] as unknown[] | undefined)?.[0]),
        // Same-day count of OTHER records (encounters aren't counted above).
        sameDayCount: day ? recordsByDay.get(day) || 0 : 0,
        source:
          connectionsById.get(d.connection_record_id)?.name ||
          d.metadata?.source_name,
      };
    });
}

function useEncounters() {
  return useRecordList<EncounterItem>({
    // Encounters plus the resource types counted as same-day activity —
    // mapEncounterDocs partitions them.
    resourceTypes: ['encounter', ...SAME_DAY_RESOURCE_TYPES],
    mapDocs: mapEncounterDocs,
    sort: compareByDateDesc,
  });
}

export function EncountersTab() {
  const { items, status, error } = useEncounters();
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
    <RecordListPage
      title="Visits"
      search={{
        query,
        onChange: setQuery,
        placeholder: 'Search visits',
        label: 'Search visits',
      }}
      status={status}
      error={error}
      loadingText="Loading visits…"
      errorText="Unable to load visits."
      isEmpty={items.length === 0}
      emptyText="No visits recorded yet."
      emptyIcon={<BuildingOffice2Icon className="h-6 w-6" />}
      isNoMatch={filtered.length === 0}
      noMatchText="No visits match this search."
    >
      {filtered.map((item) => {
        const parsed = item.location ? parseLocation(item.location) : undefined;
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
                    <Badge className="capitalize">{item.classDisplay}</Badge>
                  )}
                  <FactList facts={[item.source]} />
                </div>
              </div>
              {item.date && (
                <span className="shrink-0 text-sm text-gray-500">
                  {safeFormatDate(item.date, 'PP', '')}
                </span>
              )}
            </div>

            {parsed && (parsed.name || parsed.address || parsed.phone) && (
              <div className="mt-2 text-xs">
                {parsed.name && (
                  <p className="font-medium text-gray-700">{parsed.name}</p>
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
              <span className="mt-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                {item.sameDayCount} same-day record
                {item.sameDayCount === 1 ? '' : 's'}
              </span>
            )}

            <ManualRecordActions item={item.document} />
          </article>
        );
      })}
    </RecordListPage>
  );
}
