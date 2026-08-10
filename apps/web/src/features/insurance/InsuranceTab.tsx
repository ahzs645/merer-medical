import { useEffect, useMemo, useState } from 'react';
import {
  BuildingOffice2Icon,
  IdentificationIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { BundleEntry, Coverage } from 'fhir/r4';

import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
import { AppPage } from '../../shared/components/AppPage';
import { ErrorPanel } from '../../shared/components/StatusPanel';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { useRecordChangeTick } from '../../shared/utils/recordChangeSignal';
import { formatDisplayText } from '../../shared/utils/StyleUtils';
import { ManualRecordActions } from '../manual-entry/ManualRecordActions';
import { ManualRecordModal } from '../manual-entry/ManualRecordModal';
import { ProvenancePanel } from '../provenance/ProvenancePanel';

type CoverageDocument = ClinicalDocument<BundleEntry<Coverage>>;

type InsuranceItem = {
  document: CoverageDocument;
  coverage?: Coverage;
  connection?: ConnectionDocument;
  state: 'active' | 'inactive';
  payer: string;
  subscriberId?: string;
  relationship?: string;
  type?: string;
  phone?: string;
  address?: string;
  periodLabel: string;
  sourceText?: string;
};

export function InsuranceTab() {
  const { t } = useInterfaceLanguage();
  const { items, status, error } = useInsuranceData();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [addOpen, setAddOpen] = useState(false);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return items;

    return items.filter((item) =>
      [
        item.payer,
        item.subscriberId,
        item.relationship,
        item.type,
        item.phone,
        item.address,
        item.periodLabel,
        item.connection?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [items, query]);

  const selectedItem =
    filteredItems.find((item) => item.document.id === selectedId) ||
    filteredItems[0];

  return (
    <AppPage
      banner={
        <InsuranceHeader
          totalCount={items.length}
          activeCount={items.filter((item) => item.state === 'active').length}
          query={query}
          setQuery={setQuery}
          onAdd={() => setAddOpen(true)}
        />
      }
    >
      {/* Saving notifies the record-change signal; the coverage hook
          refreshes in place, so no reload is needed. */}
      <ManualRecordModal
        open={addOpen}
        initialRecordType="coverage"
        onClose={() => setAddOpen(false)}
      />
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 pb-24 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.25fr)] lg:px-8">
          {status === 'loading' ? (
            <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200 lg:col-span-2">
              {t('Loading insurance...')}
            </div>
          ) : status === 'error' ? (
            <div className="lg:col-span-2">
              <ErrorPanel error={error} />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-md bg-white p-8 text-center shadow-sm ring-1 ring-gray-200 lg:col-span-2">
              <ShieldCheckIcon className="mx-auto h-8 w-8 text-gray-400" />
              <h1 className="mt-3 text-lg font-semibold text-gray-900">
                {t('No insurance records')}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                {t(
                  'Coverage records from C-CDA, FHIR, or imported packages will appear here.',
                )}
              </p>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-800"
              >
                <PlusIcon className="h-4 w-4" />
                {t('Add insurance')}
              </button>
            </div>
          ) : (
            <>
              <section className="space-y-3">
                {filteredItems.map((item) => (
                  <InsurancePlanCard
                    key={item.document.id}
                    item={item}
                    selected={item.document.id === selectedItem?.document.id}
                    onSelect={() => setSelectedId(item.document.id)}
                  />
                ))}
              </section>
              {selectedItem && <InsuranceDetails item={selectedItem} />}
            </>
          )}
        </div>
      </div>
    </AppPage>
  );
}

function InsuranceHeader({
  totalCount,
  activeCount,
  query,
  setQuery,
  onAdd,
}: {
  totalCount: number;
  activeCount: number;
  query: string;
  setQuery: (value: string) => void;
  onAdd: () => void;
}) {
  const { t } = useInterfaceLanguage();

  return (
    <div className="bg-primary-800 px-3 py-4 text-white sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t('Insurance')}</h1>
          <p className="mt-1 text-sm text-primary-100">
            {t(
              'Health coverage, payer, member ID, plan period, and source provenance.',
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="rounded-md bg-white/15 px-2.5 py-1 font-medium text-white ring-1 ring-white/25">
              {activeCount} {t('active')}
            </span>
            <span className="rounded-md bg-white/15 px-2.5 py-1 font-medium text-white ring-1 ring-white/25">
              {totalCount} {t('plans')}
            </span>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
          <label className="relative w-full lg:w-96">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('Search payer, member ID, type, or address')}
              className="w-full rounded-md border-0 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
            />
          </label>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-primary-800 shadow-sm hover:bg-primary-50"
          >
            <PlusIcon className="h-4 w-4" />
            {t('Add insurance')}
          </button>
        </div>
      </div>
    </div>
  );
}

function InsurancePlanCard({
  item,
  selected,
  onSelect,
}: {
  item: InsuranceItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-md bg-white p-4 text-left shadow-sm ring-1 transition ${
        selected
          ? 'ring-primary-600'
          : 'ring-gray-200 hover:bg-gray-50 hover:ring-gray-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary-50 p-2 text-primary-700">
          <ShieldCheckIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-gray-900">
              {item.payer}
            </h2>
            <InsuranceStateBadge state={item.state} />
          </div>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <Fact label="Member ID" value={item.subscriberId} />
            <Fact label="Relationship" value={item.relationship} />
            <Fact label="Type" value={item.type} />
            {/* The end year is the whole point of the period, so this one wraps
                instead of truncating ("Jun 30, 2…" told the user nothing). */}
            <Fact label="Period" value={item.periodLabel} wrap />
          </dl>
        </div>
      </div>
    </button>
  );
}

function InsuranceDetails({ item }: { item: InsuranceItem }) {
  const { t } = useInterfaceLanguage();

  return (
    <section className="space-y-4">
      <div className="rounded-md bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <div className="flex items-start gap-3">
          <BuildingOffice2Icon className="mt-0.5 h-6 w-6 text-primary-700" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {item.payer}
            </h2>
            <p className="mt-1 text-sm text-gray-600">{item.periodLabel}</p>
          </div>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <Detail label="Status" value={item.state} />
          <Detail label="Member ID" value={item.subscriberId} />
          <Detail label="Relationship" value={item.relationship} />
          <Detail label="Plan type" value={item.type} />
          <Detail label="Phone" value={item.phone} />
          <Detail label="Address" value={item.address} wide />
          <Detail label="Source" value={item.connection?.name} wide />
        </dl>
        <ManualRecordActions item={item.document} />
      </div>

      {item.sourceText && (
        <div className="rounded-md bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <IdentificationIcon className="h-5 w-5 text-primary-700" />
            {t('Extracted coverage text')}
          </div>
          <p className="mt-3 max-h-52 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-gray-700">
            {item.sourceText}
          </p>
        </div>
      )}

      <ProvenancePanel document={item.document} connection={item.connection} />
    </section>
  );
}

function Fact({
  label,
  value,
  wrap,
}: {
  label: string;
  value?: string;
  /** Wrap onto extra lines rather than truncating (for values that lose their
   * meaning when clipped, like a coverage period's end date). */
  wrap?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-gray-900 ${
          wrap ? 'whitespace-normal break-words' : 'truncate'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function InsuranceStateBadge({ state }: { state: InsuranceItem['state'] }) {
  const className =
    state === 'active'
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-gray-100 text-gray-700';

  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${className}`}>
      {formatDisplayText(state)}
    </span>
  );
}

function Detail({
  label,
  value,
  wide,
}: {
  label: string;
  value?: string;
  wide?: boolean;
}) {
  if (!value) return null;
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
        {value}
      </dd>
    </div>
  );
}

function useInsuranceData() {
  const db = useRxDb();
  const user = useUser();
  // Refetch when a manual record is added, edited, or deleted.
  const recordChangeTick = useRecordChangeTick();
  const [items, setItems] = useState<InsuranceItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchCoverage() {
      setStatus('loading');
      setError(null);
      const [coverageDocs, connectionDocs] = await Promise.all([
        db.clinical_documents
          .find({
            selector: {
              user_id: user.id,
              'data_record.resource_type': 'coverage',
            },
            sort: [{ 'metadata.date': 'desc' }],
          })
          .exec(),
        db.connection_documents.find().exec(),
      ]);

      if (!isMounted) return;

      const connections = new Map(
        connectionDocs.map((doc) => {
          const connection = doc.toMutableJSON() as ConnectionDocument;
          return [connection.id, connection];
        }),
      );

      setItems(
        coverageDocs
          .map((doc) => doc.toMutableJSON() as CoverageDocument)
          .map((document) =>
            toInsuranceItem(
              document,
              connections.get(document.connection_record_id),
            ),
          ),
      );
      setStatus('success');
    }

    fetchCoverage().catch((e) => {
      if (!isMounted) return;
      setError(e instanceof Error ? e : new Error(String(e)));
      setStatus('error');
    });

    return () => {
      isMounted = false;
    };
  }, [db, user.id, recordChangeTick]);

  return { items, status, error };
}

function toInsuranceItem(
  document: CoverageDocument,
  connection?: ConnectionDocument,
): InsuranceItem {
  const coverage = getFhirResource<Coverage>(document);
  const payer =
    coverage?.payor
      ?.map((payor) => payor.display || payor.reference)
      .find(Boolean) ||
    document.metadata?.display_name ||
    'Coverage';
  const classes = coverage?.class || [];
  const field = (name: string) =>
    classes.find((item) => item.type?.text?.toLowerCase() === name)?.value;
  const periodLabel = formatCoveragePeriod(coverage);

  return {
    document,
    coverage,
    connection,
    state: getCoverageState(coverage),
    payer,
    subscriberId: coverage?.subscriberId,
    relationship: coverage?.relationship?.text,
    type: coverage?.type?.text || field('type'),
    phone: field('phone'),
    address: field('address'),
    periodLabel,
    sourceText: coverage?.text?.div,
  };
}

function getCoverageState(coverage?: Coverage): InsuranceItem['state'] {
  if (!coverage || coverage.status !== 'active') return 'inactive';
  if (!coverage.period?.end) return 'active';

  const end = new Date(coverage.period.end);
  if (Number.isNaN(end.getTime())) return 'active';

  return end < new Date() ? 'inactive' : 'active';
}

function formatCoveragePeriod(coverage?: Coverage) {
  const start = safeFormatDate(coverage?.period?.start, 'PP', '');
  const end = safeFormatDate(coverage?.period?.end, 'PP', '');
  if (start && end) return `${start} - ${end}`;
  if (start) return `${start} - Present`;
  return 'Period not specified';
}
