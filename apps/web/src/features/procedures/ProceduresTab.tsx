import { useMemo, useState } from 'react';
import { ScissorsIcon } from '@heroicons/react/24/outline';

import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
import { Badge } from '../../shared/components/Badge';
import { RecordListPage } from '../../shared/components/records/RecordListPage';
import {
  compareByDateDesc,
  useRecordList,
} from '../../shared/hooks/useRecordList';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { firstText, periodStart } from '../../shared/utils/fhirText';
import { ManualRecordActions } from '../manual-entry/ManualRecordActions';
import { FactList } from '../../shared/components/FactList';

interface ProcedureItem {
  id: string;
  /** Kept for `ManualRecordActions`, which decides for itself whether this
   *  record was typed here or arrived from a provider. */
  document: ClinicalDocument;
  name: string;
  status?: string;
  date?: string;
  source?: string;
}

function mapProcedureDocs(
  docs: ClinicalDocument[],
  connectionsById: Map<string, ConnectionDocument>,
): ProcedureItem[] {
  return docs.map((d) => {
    const r = getFhirResource<Record<string, unknown>>(d);
    return {
      id: d.id,
      document: d,
      name: d.metadata?.display_name || firstText(r['code']) || 'Procedure',
      status: firstText(r['status']),
      date:
        (r['performedDateTime'] as string) ||
        periodStart(r['performedPeriod']) ||
        d.metadata?.date,
      source:
        connectionsById.get(d.connection_record_id)?.name ||
        d.metadata?.source_name,
    };
  });
}

function useProcedures() {
  return useRecordList<ProcedureItem>({
    resourceTypes: ['procedure'],
    mapDocs: mapProcedureDocs,
    sort: compareByDateDesc,
  });
}

export function ProceduresTab() {
  const { items, status, error } = useProcedures();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.name, item.source]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [items, query]);

  return (
    <RecordListPage
      title="Procedures"
      search={{
        query,
        onChange: setQuery,
        placeholder: 'Search procedures',
        label: 'Search procedures',
      }}
      status={status}
      error={error}
      loadingText="Loading procedures…"
      errorText="Unable to load procedures."
      isEmpty={items.length === 0}
      emptyText="No procedures recorded yet."
      emptyIcon={<ScissorsIcon className="h-6 w-6" />}
      isNoMatch={filtered.length === 0}
      noMatchText="No procedures match this search."
    >
      {filtered.map((item) => (
        <article
          key={item.id}
          className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="break-words text-sm font-semibold text-gray-900">
                {item.name}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                {item.status && (
                  <Badge className="capitalize">{item.status}</Badge>
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
          <ManualRecordActions item={item.document} />
        </article>
      ))}
    </RecordListPage>
  );
}
