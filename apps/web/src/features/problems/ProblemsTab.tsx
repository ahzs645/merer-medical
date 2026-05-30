import {
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import {
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  NoSymbolIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
import { Routes as AppRoutes } from '../../Routes';
import { AppPage } from '../../shared/components/AppPage';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { getManualRecordNote } from '../../shared/utils/manualRecordUtils';

type ProblemStatus = 'active' | 'resolved' | 'unknown';

type ProblemItem = {
  id: string;
  name: string;
  status: ProblemStatus;
  clinicalStatus?: string;
  verificationStatus?: string;
  category?: string;
  onsetDate?: string;
  recordedDate?: string;
  abatementDate?: string;
  source?: string;
  provenance?: string;
  codes: string[];
  note?: string;
};

type FilterId = ProblemStatus | 'all';
type FhirRecord = Record<string, unknown>;

const FILTERS: {
  id: FilterId;
  label: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { id: 'all', label: 'All', icon: ClipboardDocumentListIcon },
  { id: 'active', label: 'Active', icon: CheckCircleIcon },
  { id: 'resolved', label: 'Resolved', icon: NoSymbolIcon },
  { id: 'unknown', label: 'Unknown', icon: QuestionMarkCircleIcon },
];

const GROUPS: { id: ProblemStatus; title: string }[] = [
  { id: 'active', title: 'Active problems' },
  { id: 'resolved', title: 'Resolved problems' },
  { id: 'unknown', title: 'Unknown status' },
];

const ADD_PROBLEM_PATH = `${AppRoutes.AddRecord}?type=condition`;

export function ProblemsTab() {
  const { items, status } = useProblemsData();
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterId>('all');

  const counts = useMemo(
    () =>
      FILTERS.reduce(
        (acc, filter) => {
          acc[filter.id] =
            filter.id === 'all'
              ? items.length
              : items.filter((item) => item.status === filter.id).length;
          return acc;
        },
        {} as Record<FilterId, number>,
      ),
    [items],
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter((item) => {
      if (selectedFilter !== 'all' && item.status !== selectedFilter) {
        return false;
      }

      if (!normalizedQuery) return true;

      return [
        item.name,
        item.clinicalStatus,
        item.verificationStatus,
        item.category,
        item.source,
        item.provenance,
        item.note,
        ...item.codes,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [items, query, selectedFilter]);

  return (
    <AppPage
      banner={
        <ProblemsHeader
          totalCount={items.length}
          query={query}
          selectedFilter={selectedFilter}
          counts={counts}
          onQueryChange={setQuery}
          onFilterChange={setSelectedFilter}
        />
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          {status === 'loading' ? (
            <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
              Loading problems...
            </div>
          ) : items.length === 0 ? (
            <EmptyProblemsState />
          ) : (
            <ProblemGroups
              items={filteredItems}
              selectedFilter={selectedFilter}
            />
          )}
        </div>
      </div>
    </AppPage>
  );
}

function useProblemsData() {
  const db = useRxDb();
  const user = useUser();
  const [items, setItems] = useState<ProblemItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    let isMounted = true;

    async function fetchProblems() {
      setStatus('loading');
      const [conditionDocs, connectionDocs] = await Promise.all([
        db.clinical_documents
          .find({
            selector: {
              user_id: user.id,
              'data_record.resource_type': 'condition',
            },
            sort: [{ 'metadata.date': 'desc' }],
          })
          .exec(),
        db.connection_documents
          .find({
            selector: {
              user_id: user.id,
            },
          })
          .exec(),
      ]);

      if (!isMounted) return;

      const connectionsById = new Map(
        connectionDocs.map((doc) => {
          const connection = doc.toMutableJSON() as ConnectionDocument;
          return [connection.id, connection] as const;
        }),
      );

      setItems(
        conditionDocs.map((doc) => {
          const document = doc.toMutableJSON() as ClinicalDocument;
          return toProblemItem(
            document,
            connectionsById.get(document.connection_record_id),
          );
        }),
      );
      setStatus('success');
    }

    fetchProblems();

    return () => {
      isMounted = false;
    };
  }, [db, user.id]);

  return { items, status };
}

function ProblemsHeader({
  totalCount,
  query,
  selectedFilter,
  counts,
  onQueryChange,
  onFilterChange,
}: {
  totalCount: number;
  query: string;
  selectedFilter: FilterId;
  counts: Record<FilterId, number>;
  onQueryChange: (query: string) => void;
  onFilterChange: (filter: FilterId) => void;
}) {
  return (
    <div className="border-b border-gray-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardDocumentListIcon className="h-7 w-7 text-primary-700" />
              <h1 className="text-2xl font-semibold text-gray-900">Problems</h1>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              {totalCount} {totalCount === 1 ? 'condition' : 'conditions'} from
              connected and manually entered records.
            </p>
          </div>
          <Link
            to={ADD_PROBLEM_PATH}
            className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
          >
            <PlusIcon className="h-5 w-5" />
            Add problem
          </Link>
        </div>

        <div className="rounded-md bg-gray-50 p-3 ring-1 ring-gray-200">
          <label className="relative block">
            <span className="sr-only">Search problems</span>
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search diagnosis, code, status, source, or note"
              className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {FILTERS.map((filter) => {
              const Icon = filter.icon;
              const isSelected = selectedFilter === filter.id;

              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => onFilterChange(filter.id)}
                  className={[
                    'inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium shadow-sm',
                    isSelected
                      ? 'border-primary-600 bg-primary-50 text-primary-800'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4" />
                  <span>{filter.label}</span>
                  <span className="rounded bg-white/70 px-1.5 py-0.5 text-xs">
                    {counts[filter.id] || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProblemGroups({
  items,
  selectedFilter,
}: {
  items: ProblemItem[];
  selectedFilter: FilterId;
}) {
  const groups =
    selectedFilter === 'all'
      ? GROUPS
      : GROUPS.filter((group) => group.id === selectedFilter);

  if (items.length === 0) {
    return (
      <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
        No problems match this view.
      </div>
    );
  }

  return (
    <>
      {groups.map((group) => {
        const groupItems = items.filter((item) => item.status === group.id);
        if (groupItems.length === 0) return null;

        return (
          <section key={group.id}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                {group.title}
              </h2>
              <span className="text-sm text-gray-500">
                {groupItems.length}{' '}
                {groupItems.length === 1 ? 'record' : 'records'}
              </span>
            </div>
            <div className="grid gap-3">
              {groupItems.map((item) => (
                <ProblemCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

function ProblemCard({ item }: { item: ProblemItem }) {
  return (
    <article className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-base font-semibold text-gray-900">
              {item.name}
            </h3>
            <StatusBadge status={item.status} />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {item.clinicalStatus && (
              <Badge>{humanize(item.clinicalStatus)}</Badge>
            )}
            {item.verificationStatus && (
              <Badge>{humanize(item.verificationStatus)}</Badge>
            )}
            {item.category && <Badge>{item.category}</Badge>}
            {item.codes.slice(0, 3).map((code) => (
              <Badge key={code}>{code}</Badge>
            ))}
          </div>
        </div>
        <div className="shrink-0 text-sm text-gray-500">
          {formatProblemDate(item.onsetDate || item.recordedDate)}
        </div>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Detail label="Onset" value={formatProblemDate(item.onsetDate)} />
        <Detail label="Recorded" value={formatProblemDate(item.recordedDate)} />
        <Detail
          label="Resolved"
          value={formatProblemDate(item.abatementDate)}
        />
        <Detail label="Source" value={item.source || 'Unknown'} />
      </dl>

      {item.provenance && (
        <p className="mt-3 text-sm text-gray-700">
          <span className="font-medium text-gray-900">Provenance:</span>{' '}
          {item.provenance}
        </p>
      )}
      {item.note && (
        <p className="mt-3 whitespace-pre-line rounded-md bg-gray-50 p-3 text-sm text-gray-700">
          {item.note}
        </p>
      )}
    </article>
  );
}

function EmptyProblemsState() {
  return (
    <div className="rounded-md bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-700">
        <ClipboardDocumentListIcon className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-gray-900">
        No problems yet
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-gray-600">
        Diagnoses and problem list items from connected portals or manual
        records will appear here.
      </p>
      <Link
        to={ADD_PROBLEM_PATH}
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
      >
        <PlusIcon className="h-5 w-5" />
        Add problem
      </Link>
    </div>
  );
}

function toProblemItem(
  document: ClinicalDocument,
  connection?: ConnectionDocument,
): ProblemItem {
  const resource = getFhirResource<FhirRecord>(document);
  const clinicalStatus = getCodeText(resource['clinicalStatus']);
  const verificationStatus = getCodeText(resource['verificationStatus']);
  const category = firstText(resource['category']);
  const codes = getCodes(resource['code']);
  const onsetDate = getDateValue(
    resource['onsetDateTime'] || resource['onsetPeriod'],
  );
  const abatementDate = getDateValue(
    resource['abatementDateTime'] || resource['abatementPeriod'],
  );
  const recordedDate =
    getStringValue(resource['recordedDate']) ||
    getStringValue(resource['dateRecorded']) ||
    document.metadata?.date;

  return {
    id: document.id,
    name:
      document.metadata?.display_name ||
      firstText(resource['code']) ||
      codes[0] ||
      'Unnamed problem',
    status: getProblemStatus(clinicalStatus, abatementDate),
    clinicalStatus,
    verificationStatus,
    category,
    onsetDate,
    recordedDate,
    abatementDate,
    source: connection?.name || humanize(connection?.source || ''),
    provenance: getProvenanceSummary(document, connection),
    codes,
    note: getManualRecordNote(document),
  };
}

function getProblemStatus(
  clinicalStatus: string | undefined,
  abatementDate: string | undefined,
): ProblemStatus {
  const normalized = clinicalStatus?.toLowerCase();
  if (abatementDate || normalized === 'resolved' || normalized === 'inactive') {
    return 'resolved';
  }
  if (
    normalized === 'active' ||
    normalized === 'recurrence' ||
    normalized === 'relapse'
  ) {
    return 'active';
  }
  return 'unknown';
}

function getProvenanceSummary(
  document: ClinicalDocument,
  connection?: ConnectionDocument,
) {
  const parts = [
    connection?.name,
    connection?.source ? humanize(connection.source) : undefined,
    document.data_record.format,
    document.metadata?.id,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : undefined;
}

function getCodeText(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  return firstText(value);
}

function firstText(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map(firstText).find(Boolean);
  }
  if (!isRecord(value)) return undefined;

  const coding = value['coding'];
  return (
    getStringValue(value['text']) ||
    getStringValue(value['display']) ||
    getStringValue(value['code']) ||
    (Array.isArray(coding) ? coding.map(firstText).find(Boolean) : undefined)
  );
}

function getCodes(codeableConcept: unknown): string[] {
  if (!isRecord(codeableConcept)) return [];
  const coding = codeableConcept['coding'];
  if (!Array.isArray(coding)) return [];

  return coding
    .filter(isRecord)
    .map((code) =>
      [getStringValue(code['display']), getStringValue(code['code'])]
        .filter(Boolean)
        .join(' '),
    )
    .filter(Boolean);
}

function getDateValue(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (!isRecord(value)) return undefined;
  return getStringValue(value['start']) || getStringValue(value['end']);
}

function getStringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function isRecord(value: unknown): value is FhirRecord {
  return typeof value === 'object' && value !== null;
}

function StatusBadge({ status }: { status: ProblemStatus }) {
  const className =
    status === 'active'
      ? 'bg-green-50 text-green-700 ring-green-600/20'
      : status === 'resolved'
        ? 'bg-gray-100 text-gray-700 ring-gray-500/20'
        : 'bg-amber-50 text-amber-700 ring-amber-600/20';

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${className}`}
    >
      {humanize(status)}
    </span>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-500/10">
      {children}
    </span>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm text-gray-900">
        {value || 'Unknown'}
      </dd>
    </div>
  );
}

function formatProblemDate(date?: string) {
  return safeFormatDate(date, 'PP', date || 'Unknown');
}

function humanize(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}
