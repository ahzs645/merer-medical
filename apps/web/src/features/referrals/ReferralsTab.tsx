import { useMemo } from 'react';
import { ArrowRightCircleIcon } from '@heroicons/react/24/outline';

import { Routes as AppRoutes } from '../../Routes';
import { buildAddRecordPath } from '../manual-entry/addRecordPath';
import { Badge } from '../../shared/components/Badge';
import { RecordListPage } from '../../shared/components/records/RecordListPage';
import { RecordHeaderLink } from '../../shared/components/records/RecordPageHeader';
import { ManualRecordActions } from '../manual-entry/ManualRecordActions';
import {
  compareByDateDesc,
  useRecordList,
} from '../../shared/hooks/useRecordList';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { mapReferralDocs, type ReferralItem } from './referralRecords';
import { FactList } from '../../shared/components/FactList';
import { useListViewParams } from '../../shared/hooks/useListViewParams';

function useReferrals() {
  // useRecordList re-runs on the shared record-change signal, so a referral
  // saved from the button below appears without a reload.
  return useRecordList<ReferralItem>({
    resourceTypes: ['servicerequest'],
    mapDocs: mapReferralDocs,
    sort: compareByDateDesc,
  });
}

// Referrals was one of two browsable categories with no way to add a record by
// hand: a referral letter you were handed could be filed nowhere.
const ADD_REFERRAL_PATH = buildAddRecordPath({
  type: 'servicerequest',
  returnTo: AppRoutes.Referrals,
});

export function ReferralsTab() {
  const { items, status, error } = useReferrals();
  // Search lives in the URL, so the view survives Back, can be linked, and
  // comes back the same length it left — see useListViewParams.
  const { query, setQuery } = useListViewParams();

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
      action={
        <RecordHeaderLink to={ADD_REFERRAL_PATH} label="Add referral" compact />
      }
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
          className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="break-words text-sm font-semibold text-gray-900">
                {item.name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                {item.status && (
                  <Badge className="capitalize">{item.status}</Badge>
                )}
                <FactList
                  facts={[item.requester, item.performer, item.source]}
                />
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
          </div>
          {/* A referral you typed is a referral you can mistype. The component
              shows nothing for records synced from a provider. */}
          <ManualRecordActions item={item.document} />
        </article>
      ))}
    </RecordListPage>
  );
}
