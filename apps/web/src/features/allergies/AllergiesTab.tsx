import { useMemo, useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
import { Badge } from '../../shared/components/Badge';
import { RecordListPage } from '../../shared/components/records/RecordListPage';
import {
  compareByDateDesc,
  useRecordList,
} from '../../shared/hooks/useRecordList';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { getAllergyIntoleranceDisplayName } from '../../shared/utils/fhirAccessHelpers';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { firstText, periodStart } from '../../shared/utils/fhirText';

interface AllergyItem {
  id: string;
  name: string;
  clinicalStatus?: string;
  reaction?: string;
  severity?: string;
  date?: string;
  source?: string;
}

function mapAllergyDocs(
  docs: ClinicalDocument[],
  connectionsById: Map<string, ConnectionDocument>,
): AllergyItem[] {
  return docs.map((d) => {
    const r = getFhirResource<Record<string, unknown>>(d);
    const reaction = Array.isArray(r['reaction'])
      ? (r['reaction'][0] as Record<string, unknown> | undefined)
      : undefined;
    return {
      id: d.id,
      name:
        getAllergyIntoleranceDisplayName(d) ||
        d.metadata?.display_name ||
        firstText(r['code']) ||
        'Allergy',
      clinicalStatus: firstText(r['clinicalStatus']),
      reaction: firstText(reaction?.['manifestation']),
      severity: firstText(reaction?.['severity']),
      date:
        (r['recordedDate'] as string) ||
        (r['onsetDateTime'] as string) ||
        periodStart(r['onsetPeriod']) ||
        d.metadata?.date,
      source:
        connectionsById.get(d.connection_record_id)?.name ||
        d.metadata?.source_name,
    };
  });
}

function useAllergies() {
  return useRecordList<AllergyItem>({
    resourceTypes: ['allergyintolerance'],
    mapDocs: mapAllergyDocs,
    sort: compareByDateDesc,
  });
}

export function AllergiesTab() {
  const { items, status, error } = useAllergies();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.name, item.reaction, item.source]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [items, query]);

  return (
    <RecordListPage
      title="Allergies"
      search={{
        query,
        onChange: setQuery,
        placeholder: 'Search allergies',
        label: 'Search allergies',
      }}
      status={status}
      error={error}
      loadingText="Loading allergies…"
      errorText="Unable to load allergies."
      isEmpty={items.length === 0}
      emptyText="No allergies recorded yet."
      emptyIcon={<ExclamationTriangleIcon className="h-6 w-6" />}
      isNoMatch={filtered.length === 0}
      noMatchText="No allergies match this search."
    >
      {filtered.map((item) => (
        <article
          key={item.id}
          className="flex items-start justify-between gap-3 rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200"
        >
          <div className="min-w-0">
            <h3 className="break-words text-sm font-semibold text-gray-900">
              {item.name}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              {item.clinicalStatus && (
                <Badge className="capitalize">{item.clinicalStatus}</Badge>
              )}
              {item.reaction && <span>· {item.reaction}</span>}
              {item.severity && (
                <span className="capitalize">· {item.severity}</span>
              )}
              {item.source && <span>· {item.source}</span>}
            </div>
          </div>
          {item.date && (
            <span className="shrink-0 text-sm text-gray-500">
              {safeFormatDate(item.date, 'PP', '')}
            </span>
          )}
        </article>
      ))}
    </RecordListPage>
  );
}
