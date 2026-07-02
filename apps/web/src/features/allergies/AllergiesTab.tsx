import { useEffect, useMemo, useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
import { Badge } from '../../shared/components/Badge';
import { RecordListPage } from '../../shared/components/records/RecordListPage';
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

function useAllergies() {
  const db = useRxDb();
  const user = useUser();
  const [items, setItems] = useState<AllergyItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setStatus('loading');
      setError(null);
      const [docs, connectionDocs] = await Promise.all([
        db.clinical_documents
          .find({
            selector: {
              user_id: user.id,
              'data_record.resource_type': 'allergyintolerance',
            },
          })
          .exec(),
        db.connection_documents.find({ selector: { user_id: user.id } }).exec(),
      ]);
      if (!mounted) return;
      const connById = new Map(
        connectionDocs.map((d) => {
          const c = d.toMutableJSON() as ConnectionDocument;
          return [c.id, c] as const;
        }),
      );
      const list = docs.map((doc) => {
        const d = doc.toMutableJSON() as ClinicalDocument;
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
            connById.get(d.connection_record_id)?.name ||
            d.metadata?.source_name,
        };
      });
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setItems(list);
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
  }, [db, user.id]);

  return { items, status, error };
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
