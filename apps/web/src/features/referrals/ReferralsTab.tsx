import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
import { AppPage } from '../../shared/components/AppPage';
import { GenericBanner } from '../../shared/components/GenericBanner';
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
  const [status, setStatus] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setStatus('loading');
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
    load();
    return () => {
      mounted = false;
    };
  }, [db, user.id]);

  return { items, status };
}

export function ReferralsTab() {
  const { items, status } = useReferrals();
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
    <AppPage banner={<GenericBanner text="Referrals" />}>
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-3xl gap-3 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          <label className="relative block">
            <span className="sr-only">Search referrals</span>
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search referrals"
              className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </label>

          {status === 'loading' ? (
            <Placeholder text="Loading referrals…" />
          ) : items.length === 0 ? (
            <Placeholder text="No referrals recorded yet." icon />
          ) : filtered.length === 0 ? (
            <Placeholder text="No referrals match this search." />
          ) : (
            filtered.map((item) => (
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
                      <span className="capitalize">{item.status}</span>
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
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-700">
          <ArrowRightCircleIcon className="h-6 w-6" />
        </div>
      )}
      {text}
    </div>
  );
}
