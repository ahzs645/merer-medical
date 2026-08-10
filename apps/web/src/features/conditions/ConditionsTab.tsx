import { useMemo, useState } from 'react';
import { Squares2X2Icon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

import { Routes as AppRoutes } from '../../Routes';
import { AppPage } from '../../shared/components/AppPage';
import {
  RecordHeaderLink,
  RecordPageHeader,
} from '../../shared/components/records/RecordPageHeader';
import { ErrorPanel } from '../../shared/components/StatusPanel';
import { useConditionsData } from './hooks/useConditionsData';
import { ConditionBundle, RelatedKind } from './types';

const KIND_LABEL: Record<RelatedKind, [string, string]> = {
  medication: ['med', 'meds'],
  lab: ['lab', 'labs'],
  careplan: ['care plan', 'care plans'],
  goal: ['goal', 'goals'],
  procedure: ['procedure', 'procedures'],
};

function conditionDetailPath(id: string): string {
  return `${AppRoutes.Conditions}/${encodeURIComponent(id)}`;
}

export function ConditionsTab() {
  const { bundles, status, error } = useConditionsData();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bundles;
    return bundles.filter((bundle) =>
      [bundle.name, ...bundle.codes, ...bundle.topicLabels]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q)),
    );
  }, [bundles, query]);

  return (
    <AppPage
      banner={
        <ConditionsHeader
          total={bundles.length}
          query={query}
          onQueryChange={setQuery}
        />
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          {status === 'loading' ? (
            <Placeholder text="Loading conditions..." />
          ) : status === 'error' ? (
            <ErrorPanel error={error} />
          ) : bundles.length === 0 ? (
            <EmptyState />
          ) : filtered.length === 0 ? (
            <Placeholder text="No conditions match this search." />
          ) : (
            <div className="grid gap-3">
              {filtered.map((bundle) => (
                <ConditionRow key={bundle.id} bundle={bundle} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppPage>
  );
}

function ConditionsHeader({
  total,
  query,
  onQueryChange,
}: {
  total: number;
  query: string;
  onQueryChange: (value: string) => void;
}) {
  return (
    <RecordPageHeader
      title="My Conditions"
      icon={Squares2X2Icon}
      description={`${total} ${
        total === 1 ? 'condition' : 'conditions'
      }, each with its related medications, labs, care plans, goals and procedures pulled together.`}
      search={{
        query,
        onChange: onQueryChange,
        placeholder: 'Search condition, code, or topic',
        label: 'Search conditions',
      }}
      action={
        <RecordHeaderLink
          to={`${AppRoutes.AddRecord}?type=condition`}
          label="Add condition"
        />
      }
    />
  );
}

function ConditionRow({ bundle }: { bundle: ConditionBundle }) {
  const counts = countByKind(bundle);

  return (
    <Link
      to={conditionDetailPath(bundle.id)}
      className="block rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200 transition hover:ring-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-base font-semibold text-gray-900">
              {bundle.name}
            </h3>
            <StatusBadge status={bundle.status} />
          </div>
          {bundle.topicLabels.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {bundle.topicLabels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center rounded-md bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700 ring-1 ring-inset ring-primary-600/10"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
        <span className="shrink-0 text-sm font-medium text-primary-700">
          {bundle.related.length} related
        </span>
      </div>

      {bundle.related.length > 0 && (
        <p className="mt-3 text-sm text-gray-600">
          {counts
            .map(([kind, count]) => {
              const [singular, plural] = KIND_LABEL[kind];
              return `${count} ${count === 1 ? singular : plural}`;
            })
            .join(' · ')}
        </p>
      )}
    </Link>
  );
}

function countByKind(bundle: ConditionBundle): [RelatedKind, number][] {
  const order: RelatedKind[] = [
    'medication',
    'lab',
    'careplan',
    'goal',
    'procedure',
  ];
  return order
    .map((kind) => [
      kind,
      bundle.related.filter((record) => record.kind === kind).length,
    ])
    .filter(([, count]) => (count as number) > 0) as [RelatedKind, number][];
}

function StatusBadge({ status }: { status: ConditionBundle['status'] }) {
  const className =
    status === 'active'
      ? 'bg-green-50 text-green-700 ring-green-600/20'
      : status === 'resolved'
        ? 'bg-gray-100 text-gray-700 ring-gray-500/20'
        : 'bg-amber-50 text-amber-700 ring-amber-600/20';
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize ring-1 ring-inset ${className}`}
    >
      {status}
    </span>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
      {text}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-md bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-700">
        <Squares2X2Icon className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-gray-900">
        No conditions yet
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-gray-600">
        Once you connect a portal or add a diagnosis, each condition will appear
        here alongside its related medications, labs, and care plans.
      </p>
      <Link
        to={AppRoutes.Problems}
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
      >
        Go to Problems
      </Link>
    </div>
  );
}
