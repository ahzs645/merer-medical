import { FlagIcon } from '@heroicons/react/24/outline';

import { Routes as AppRoutes } from '../../Routes';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import {
  EmptyStateLink,
  RecordListPage,
} from '../../shared/components/records/RecordListPage';
import { RecordHeaderLink } from '../../shared/components/records/RecordPageHeader';
import { useRecordList } from '../../shared/hooks/useRecordList';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { firstText, isRecord } from '../../shared/utils/fhirText';
import { buildAddRecordPath } from '../manual-entry/addRecordPath';
import { ManualRecordActions } from '../manual-entry/ManualRecordActions';

const ADD_GOAL_PATH = buildAddRecordPath({
  type: 'goal',
  returnTo: AppRoutes.Goals,
});

interface GoalItem {
  id: string;
  /** Kept for `ManualRecordActions`, which decides for itself whether this
   *  record was typed here or arrived from a provider. */
  document: ClinicalDocument;
  description: string;
  status?: string;
  achievement?: string;
  addresses: string[];
  startDate?: string;
}

function mapGoalDocs(docs: ClinicalDocument[]): GoalItem[] {
  return docs.map((d) => {
    const r = getFhirResource<Record<string, unknown>>(d);
    const addresses = Array.isArray(r['addresses'])
      ? (r['addresses'] as unknown[])
          .map((a) => (isRecord(a) ? (a['display'] as string) : undefined))
          .filter((x): x is string => Boolean(x))
      : [];
    return {
      id: d.id,
      document: d,
      description:
        firstText(r['description']) || d.metadata?.display_name || 'Goal',
      status: firstText(r['lifecycleStatus']) || firstText(r['status']),
      achievement: firstText(r['achievementStatus']),
      addresses,
      startDate: (r['startDate'] as string) || d.metadata?.date,
    };
  });
}

function useGoals() {
  return useRecordList<GoalItem>({
    resourceTypes: ['goal'],
    mapDocs: mapGoalDocs,
  });
}

export function GoalsTab() {
  const { items, status, error } = useGoals();

  return (
    <RecordListPage
      title="Goals"
      action={<RecordHeaderLink to={ADD_GOAL_PATH} label="Add goal" compact />}
      status={status}
      error={error}
      loadingText="Loading goals…"
      errorText="Unable to load goals."
      isEmpty={items.length === 0}
      emptyText="No health goals recorded yet."
      emptyIcon={<FlagIcon className="h-6 w-6" />}
      emptyAction={<EmptyStateLink to={ADD_GOAL_PATH} label="Add goal" />}
    >
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="break-words text-base font-semibold text-gray-900">
                {item.description}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {item.achievement && (
                  <span className="inline-flex items-center rounded bg-blue-50 px-2 py-0.5 text-xs font-medium capitalize text-blue-700 ring-1 ring-inset ring-blue-600/10">
                    {item.achievement}
                  </span>
                )}
                {item.status && (
                  <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-700">
                    {item.status}
                  </span>
                )}
                {item.addresses.map((address) => (
                  <span
                    key={address}
                    className="inline-flex items-center rounded bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 ring-1 ring-inset ring-primary-600/10"
                  >
                    {address}
                  </span>
                ))}
              </div>
            </div>
            {item.startDate && (
              <span className="shrink-0 text-sm text-gray-500">
                {safeFormatDate(item.startDate, 'PP', '')}
              </span>
            )}
          </div>
          <ManualRecordActions item={item.document} />
        </article>
      ))}
    </RecordListPage>
  );
}
