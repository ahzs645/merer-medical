import { useMemo } from 'react';
import {
  ChevronRightIcon,
  PlusIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

import { Routes as AppRoutes } from '../../Routes';
import { AppPage } from '../../shared/components/AppPage';
import {
  RecordHeaderLink,
  RecordPageHeader,
} from '../../shared/components/records/RecordPageHeader';
import {
  CONDITION_VIEWS,
  RecordViewSwitch,
} from '../../shared/components/records/RecordViewSwitch';
import { ErrorPanel } from '../../shared/components/StatusPanel';
import { buildAddRecordPath } from '../manual-entry/addRecordPath';
import { useConditionsData } from './hooks/useConditionsData';
import { ConditionBundle, RelatedKind } from './types';
import { useListViewParams } from '../../shared/hooks/useListViewParams';

const KIND_LABEL: Record<RelatedKind, [string, string]> = {
  medication: ['med', 'meds'],
  lab: ['lab', 'labs'],
  careplan: ['care plan', 'care plans'],
  goal: ['goal', 'goals'],
  procedure: ['procedure', 'procedures'],
  referral: ['referral', 'referrals'],
};

// Same record, same word as Problems. The two pages are two views of one pile
// of FHIR Conditions, and calling it a "problem" on one and a "condition" on
// the other invented a second record type that does not exist. `returnTo` is
// what still makes the two buttons different: each lands you back on the list
// you were building.
const ADD_CONDITION_PATH = buildAddRecordPath({
  type: 'condition',
  returnTo: AppRoutes.Conditions,
});

function conditionDetailPath(id: string): string {
  return `${AppRoutes.Conditions}/${encodeURIComponent(id)}`;
}

export function ConditionsTab() {
  const { bundles, status, error } = useConditionsData();
  // Search lives in the URL, so the view survives Back, can be linked, and
  // comes back the same length it left — see useListViewParams.
  const { query, setQuery } = useListViewParams();

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
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          {status === 'loading' ? (
            <Placeholder text="Loading conditions..." />
          ) : status === 'error' ? (
            <ErrorPanel error={error} />
          ) : bundles.length === 0 ? (
            <EmptyState />
          ) : filtered.length === 0 ? (
            <Placeholder text="No conditions match this search." />
          ) : (
            // A list, not a stack of cards: one row per condition, read top to
            // bottom, each opening the condition's page — where its source,
            // Edit and its related records are.
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-gray-200">
              {filtered.map((bundle) => (
                <ConditionRow key={bundle.id} bundle={bundle} />
              ))}
            </ul>
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
      // "My conditions" beside a "Problems" entry listing the same records read
      // as two categories. One name, two views, and the switch says which.
      title="Conditions"
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
        <>
          <RecordViewSwitch views={CONDITION_VIEWS} label="Condition views" />
          <RecordHeaderLink
            to={ADD_CONDITION_PATH}
            label="Add condition"
            compact
          />
        </>
      }
    />
  );
}

function ConditionRow({ bundle }: { bundle: ConditionBundle }) {
  const counts = countByKind(bundle);
  // Topic and the related-record tally share one line under the name. The
  // card version had a topic chip, a "91 related" total, the tally, and a row
  // of View source / Edit / Delete under every condition.
  const meta = [
    bundle.topicLabels.join(', '),
    counts
      .map(([kind, count]) => {
        const [singular, plural] = KIND_LABEL[kind];
        return `${count} ${count === 1 ? singular : plural}`;
      })
      .join(' · '),
  ].filter(Boolean);

  return (
    <li>
      <Link
        to={conditionDetailPath(bundle.id)}
        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="break-words text-sm font-semibold text-gray-900">
              {bundle.name}
            </h2>
            <StatusBadge status={bundle.status} />
          </div>
          {meta.length > 0 && (
            <p className="mt-0.5 line-clamp-2 text-xs text-gray-600">
              {meta.join(' · ')}
            </p>
          )}
        </div>
        <ChevronRightIcon
          className="h-4 w-4 shrink-0 text-gray-400 rtl:rotate-180"
          aria-hidden="true"
        />
      </Link>
    </li>
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
      {/* Was "Go to Problems", which asked a reader with nothing on this page
          to go somewhere else under another name to type the same record. */}
      <Link
        to={ADD_CONDITION_PATH}
        className="mt-5 inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
      >
        <PlusIcon className="h-5 w-5 shrink-0" />
        Add condition
      </Link>
    </div>
  );
}
