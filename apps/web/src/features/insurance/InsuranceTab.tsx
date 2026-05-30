import { useEffect, useMemo, useState } from 'react';
import {
  BuildingOffice2Icon,
  IdentificationIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { BundleEntry, Coverage } from 'fhir/r4';

import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { ConnectionDocument } from '../../models/connection-document/ConnectionDocument.type';
import { AppPage } from '../../shared/components/AppPage';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { ProvenancePanel } from '../provenance/ProvenancePanel';

type CoverageDocument = ClinicalDocument<BundleEntry<Coverage>>;

type InsuranceItem = {
  document: CoverageDocument;
  coverage?: Coverage;
  connection?: ConnectionDocument;
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
  const { items, status } = useInsuranceData();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | undefined>();

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
          activeCount={items.filter((item) => item.coverage?.status === 'active').length}
          query={query}
          setQuery={setQuery}
        />
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 pb-24 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.25fr)] lg:px-8">
          {status === 'loading' ? (
            <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200 lg:col-span-2">
              {t('Loading insurance...')}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-md bg-white p-8 text-center shadow-sm ring-1 ring-gray-200 lg:col-span-2">
              <ShieldCheckIcon className="mx-auto h-8 w-8 text-gray-400" />
              <h1 className="mt-3 text-lg font-semibold text-gray-900">
                {t('No insurance records')}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                {t('Coverage records from C-CDA, FHIR, or imported packages will appear here.')}
              </p>
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
}: {
  totalCount: number;
  activeCount: number;
  query: string;
  setQuery: (value: string) => void;
}) {
  const { t } = useInterfaceLanguage();

  return (
    <div className="border-b border-gray-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('Insurance')}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {t('Health coverage, payer, member ID, plan period, and source provenance.')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="rounded-md bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800 ring-1 ring-emerald-200">
              {activeCount} {t('active')}
            </span>
            <span className="rounded-md bg-gray-100 px-2.5 py-1 font-medium text-gray-700 ring-1 ring-gray-200">
              {totalCount} {t('plans')}
            </span>
          </div>
        </div>
        <label className="relative w-full lg:w-96">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('Search payer, member ID, type, or address')}
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </label>
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
            {item.coverage?.status && (
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium capitalize text-emerald-700">
                {item.coverage.status}
              </span>
            )}
          </div>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <Fact label="Member ID" value={item.subscriberId} />
            <Fact label="Relationship" value={item.relationship} />
            <Fact label="Type" value={item.type} />
            <Fact label="Period" value={item.periodLabel} />
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
            <h2 className="text-lg font-semibold text-gray-900">{item.payer}</h2>
            <p className="mt-1 text-sm text-gray-600">{item.periodLabel}</p>
          </div>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <Detail label="Member ID" value={item.subscriberId} />
          <Detail label="Relationship" value={item.relationship} />
          <Detail label="Plan type" value={item.type} />
          <Detail label="Phone" value={item.phone} />
          <Detail label="Address" value={item.address} wide />
          <Detail label="Source" value={item.connection?.name} wide />
        </dl>
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

function Fact({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-gray-900">{value}</dd>
    </div>
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
      <dd className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{value}</dd>
    </div>
  );
}

function useInsuranceData() {
  const db = useRxDb();
  const user = useUser();
  const [items, setItems] = useState<InsuranceItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    let isMounted = true;

    async function fetchCoverage() {
      setStatus('loading');
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

    fetchCoverage();

    return () => {
      isMounted = false;
    };
  }, [db, user.id]);

  return { items, status };
}

function toInsuranceItem(
  document: CoverageDocument,
  connection?: ConnectionDocument,
): InsuranceItem {
  const coverage = getFhirResource<Coverage>(document);
  const payer =
    coverage?.payor?.map((payor) => payor.display || payor.reference).find(Boolean) ||
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

function formatCoveragePeriod(coverage?: Coverage) {
  const start = safeFormatDate(coverage?.period?.start, 'PP', '');
  const end = safeFormatDate(coverage?.period?.end, 'PP', '');
  if (start && end) return `${start} - ${end}`;
  if (start) return `${start} - Present`;
  return 'Period not specified';
}
