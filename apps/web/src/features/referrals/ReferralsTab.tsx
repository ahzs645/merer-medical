import { useEffect, useMemo, useState } from 'react';
import { ArrowRightCircleIcon } from '@heroicons/react/24/outline';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
import { Badge } from '../../shared/components/Badge';
import { RecordListPage } from '../../shared/components/records/RecordListPage';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { firstText, periodStart } from '../../shared/utils/fhirText';

interface ReferralItem {
  id: string;
  name: string;
  status?: string;
  requester?: string;
  performer?: string;
  notes: string[];
  date?: string;
  source?: string;
}

function useReferrals() {
  const db = useRxDb();
  const user = useUser();
  const [items, setItems] = useState<ReferralItem[]>([]);
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
              'data_record.resource_type': 'servicerequest',
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
        const requester = r['requester'] as Record<string, unknown> | undefined;
        const performer = Array.isArray(r['performer'])
          ? (r['performer'][0] as Record<string, unknown> | undefined)
          : undefined;
        const notes = Array.isArray(r['note'])
          ? (r['note'] as Array<Record<string, unknown>>)
              .map((n) => firstText(n['text']))
              .filter((t): t is string => Boolean(t))
          : [];
        return {
          id: d.id,
          name: d.metadata?.display_name || firstText(r['code']) || 'Referral',
          status: firstText(r['status']),
          requester: firstText(requester?.['display']),
          performer: firstText(performer?.['display']),
          notes,
          date:
            (r['authoredOn'] as string) ||
            periodStart(r['occurrencePeriod']) ||
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

export function ReferralsTab() {
  const { items, status, error } = useReferrals();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.name, item.requester, item.performer, item.source]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [items, query]);

  return (
    <RecordListPage
      title="Referrals"
      search={{
        query,
        onChange: setQuery,
        placeholder: 'Search referrals',
        label: 'Search referrals',
      }}
      status={status}
      error={error}
      loadingText="Loading referrals…"
      errorText="Unable to load referrals."
      isEmpty={items.length === 0}
      emptyText="No referrals recorded yet."
      emptyIcon={<ArrowRightCircleIcon className="h-6 w-6" />}
      isNoMatch={filtered.length === 0}
      noMatchText="No referrals match this search."
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
              {item.status && (
                <Badge className="capitalize">{item.status}</Badge>
              )}
              {item.requester && <span>· {item.requester}</span>}
              {item.performer && <span>· {item.performer}</span>}
              {item.source && <span>· {item.source}</span>}
            </div>
            {item.notes.length > 0 && (
              <div className="mt-2 space-y-1 text-xs text-gray-600">
                {item.notes.map((note, i) => (
                  <p key={i} className="break-words">
                    {note}
                  </p>
                ))}
              </div>
            )}
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
