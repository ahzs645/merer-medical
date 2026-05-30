import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AllergyIntolerance,
  BundleEntry,
  FhirResource,
} from 'fhir/r2';
import {
  BeakerIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  NoSymbolIcon,
  PlusIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';

import { Routes as AppRoutes } from '../../Routes';
import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { AppPage } from '../../shared/components/AppPage';
import { getFhirResource } from '../../shared/utils/fhirResource';
import {
  normalizeMedicationDocuments,
  type MedicationReconciliationState,
  type MedicationTimelineItem,
} from './';

const MEDICATION_RESOURCE_TYPES = [
  'medicationstatement',
  'medicationrequest',
  'medicationorder',
  'medicationdispense',
  'medicationadministration',
];

type MedicationGroup =
  | 'current'
  | 'planned'
  | 'stopped'
  | 'supplements'
  | 'needsReview';

type NutritionFact = {
  label: string;
  value: string;
};

type MedicationViewItem = MedicationTimelineItem & {
  group: MedicationGroup;
  nutritionFacts: NutritionFact[];
};

type FilterChip = {
  id: MedicationGroup | 'all';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const FILTERS: FilterChip[] = [
  { id: 'all', label: 'All', icon: ShieldCheckIcon },
  { id: 'current', label: 'Current', icon: CheckCircleIcon },
  { id: 'planned', label: 'Planned', icon: ClockIcon },
  { id: 'stopped', label: 'Stopped', icon: NoSymbolIcon },
  { id: 'supplements', label: 'Supplements', icon: BeakerIcon },
  {
    id: 'needsReview',
    label: 'Needs review',
    icon: ExclamationTriangleIcon,
  },
];

const ADD_MEDICATION_PATH = `${AppRoutes.AddRecord}?type=medicationstatement`;

export function MedicationsTab() {
  const db = useRxDb();
  const user = useUser();
  const [items, setItems] = useState<MedicationViewItem[]>([]);
  const [allergies, setAllergies] = useState<ClinicalDocument[]>([]);
  const [status, setStatus] = useState<'loading' | 'success'>('loading');
  const [selectedFilter, setSelectedFilter] = useState<FilterChip['id']>('all');
  const [query, setQuery] = useState('');
  const { t } = useInterfaceLanguage();

  useEffect(() => {
    let isMounted = true;

    async function fetchMedications() {
      setStatus('loading');
      const [docs, allergyDocs] = await Promise.all([
        db.clinical_documents
          .find({
            selector: {
              user_id: user.id,
              'data_record.resource_type': { $in: MEDICATION_RESOURCE_TYPES },
            },
            sort: [{ 'metadata.date': 'desc' }],
          })
          .exec(),
        db.clinical_documents
          .find({
            selector: {
              user_id: user.id,
              'data_record.resource_type': 'allergyintolerance',
            },
            sort: [{ 'metadata.date': 'desc' }],
          })
          .exec(),
      ]);

      if (!isMounted) return;
      setItems(
        normalizeMedicationDocuments(
          docs.map((doc) => doc.toMutableJSON() as ClinicalDocument),
        ).map(toMedicationViewItem),
      );
      setAllergies(
        allergyDocs.map((doc) => doc.toMutableJSON() as ClinicalDocument),
      );
      setStatus('success');
    }

    fetchMedications();

    return () => {
      isMounted = false;
    };
  }, [db, user.id]);

  const counts = useMemo(() => {
    return FILTERS.reduce(
      (acc, filter) => {
        acc[filter.id] =
          filter.id === 'all'
            ? items.length
            : items.filter((item) => item.group === filter.id).length;
        return acc;
      },
      {} as Record<FilterChip['id'], number>,
    );
  }, [items]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchesFilter =
        selectedFilter === 'all' || item.group === selectedFilter;
      if (!matchesFilter) return false;
      if (!normalizedQuery) return true;

      return [
        item.name,
        item.status,
        item.conditionReason,
        sourceLabel(item.source),
        item.category,
        item.adherence,
        item.conditionalInstructions,
        item.rxNorm?.code,
        item.rxNorm?.display,
        item.reconciliationState,
        ...item.nutritionFacts.map((fact) => `${fact.label} ${fact.value}`),
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedQuery));
    });
  }, [items, query, selectedFilter]);

  const supplementItems = filteredItems.filter(
    (item) => item.group === 'supplements',
  );

  return (
    <AppPage
      banner={
        <div className="border-b border-gray-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Medications
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Reconciled prescriptions, planned therapy, stopped medications,
                supplements, adherence, and source history.
              </p>
            </div>
            <Link
              to={ADD_MEDICATION_PATH}
              className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
            >
              <PlusIcon className="h-5 w-5" />
              {t('Add medication')}
            </Link>
          </div>
        </div>
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          {status === 'loading' ? (
            <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
              Loading medications...
            </div>
          ) : items.length === 0 ? (
            <EmptyMedicationsState />
          ) : (
            <>
              <MedicationToolbar
                counts={counts}
                query={query}
                selectedFilter={selectedFilter}
                onQueryChange={setQuery}
                onFilterChange={setSelectedFilter}
              />

              <AllergySafetyPanel allergies={allergies} />

              {supplementItems.length > 0 && (
                <SupplementsPanel items={supplementItems} />
              )}

              <MedicationSection
                title={sectionTitle(selectedFilter)}
                items={filteredItems}
              />
            </>
          )}
        </div>
      </div>
    </AppPage>
  );
}

function EmptyMedicationsState() {
  const { t } = useInterfaceLanguage();

  return (
    <div className="rounded-md bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-700">
        <BeakerIcon className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-gray-900">
        {t('No medications yet')}
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-gray-600">
        {t(
          'Add a prescription, over-the-counter medication, or supplement directly. Connected portal records will appear here too.',
        )}
      </p>
      <Link
        to={ADD_MEDICATION_PATH}
        className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
      >
        <PlusIcon className="h-5 w-5" />
        {t('Add medication')}
      </Link>
    </div>
  );
}

function MedicationToolbar({
  counts,
  query,
  selectedFilter,
  onQueryChange,
  onFilterChange,
}: {
  counts: Record<FilterChip['id'], number>;
  query: string;
  selectedFilter: FilterChip['id'];
  onQueryChange: (value: string) => void;
  onFilterChange: (value: FilterChip['id']) => void;
}) {
  return (
    <div className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="relative">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        <input
          className="h-10 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          placeholder="Search medication, condition, source, status, or supplement ingredient"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const Icon = filter.icon;
          const isSelected = selectedFilter === filter.id;

          return (
            <button
              key={filter.id}
              type="button"
              className={[
                'inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium shadow-sm',
                isSelected
                  ? 'border-primary-600 bg-primary-50 text-primary-800'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
              ].join(' ')}
              onClick={() => onFilterChange(filter.id)}
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
  );
}

function AllergySafetyPanel({ allergies }: { allergies: ClinicalDocument[] }) {
  if (allergies.length === 0) return null;

  const activeAllergies = allergies
    .map((doc) => {
      const resource = getFhirResource<AllergyIntolerance & FhirResource>(
        doc as ClinicalDocument<BundleEntry<AllergyIntolerance>>,
      );
      const status =
        (resource as any)?.clinicalStatus?.text ||
        (resource as any)?.status ||
        'active';
      return {
        id: doc.id,
        name:
          (resource as any)?.code?.text ||
          (resource as any)?.substance?.text ||
          (resource as any)?.substance?.coding?.[0]?.display ||
          doc.metadata?.display_name ||
          'Allergy',
        status,
        reaction: ((resource as any)?.reaction || [])
          .map((reaction: any) =>
            [
              reaction.manifestation?.[0]?.text,
              reaction.severity,
              reaction.description,
            ]
              .filter(Boolean)
              .join(' - '),
          )
          .filter(Boolean)
          .join('; '),
      };
    })
    .filter(
      (item) =>
        !['inactive', 'resolved', 'entered-in-error'].includes(
          item.status.toLowerCase(),
        ),
    );

  if (activeAllergies.length === 0) return null;

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-amber-200">
      <div className="flex items-center gap-2">
        <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
          Allergy safety review
        </h2>
      </div>
      <p className="mt-2 text-sm text-gray-600">
        Keep this list reconciled before starting, stopping, or sharing
        medications. Imported allergies can be stale or duplicated across
        portals.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {activeAllergies.slice(0, 12).map((allergy) => (
          <span
            key={allergy.id}
            className="rounded-md bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
            title={allergy.reaction}
          >
            {allergy.name}
            {allergy.reaction ? ` - ${allergy.reaction}` : ''}
          </span>
        ))}
      </div>
    </section>
  );
}

function SupplementsPanel({ items }: { items: MedicationViewItem[] }) {
  const facts = items.flatMap((item) =>
    item.nutritionFacts.map((fact) => ({
      ...fact,
      medicationName: item.name,
      id: `${item.id}-${fact.label}-${fact.value}`,
    })),
  );

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex items-center gap-2">
        <BeakerIcon className="h-5 w-5 text-primary-700" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
          Supplements and Nutrition
        </h2>
      </div>
      {facts.length === 0 ? (
        <p className="mt-3 text-sm text-gray-600">
          Supplement records are present, but no vitamin, mineral, or nutrition
          facts were provided.
        </p>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {facts.map((fact) => (
            <div
              key={fact.id}
              className="rounded-md border border-gray-200 bg-gray-50 p-3"
            >
              <p className="text-xs font-medium text-gray-500">
                {fact.medicationName}
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {fact.label}
              </p>
              <p className="text-sm text-gray-700">{fact.value}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function MedicationSection({
  title,
  items,
}: {
  title: string;
  items: MedicationViewItem[];
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
        No medications match this view.
      </div>
    );
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
          {title}
        </h2>
        <span className="text-sm text-gray-500">
          {items.length} {items.length === 1 ? 'record' : 'records'}
        </span>
      </div>
      <div className="grid gap-3">
        {items.map((item) => (
          <MedicationCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function MedicationCard({ item }: { item: MedicationViewItem }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <article className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-base font-semibold text-gray-900">
              {item.name}
            </h3>
            <ReconciliationBadge state={item.reconciliationState} />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={statusTone(item.status)}>
              {humanize(item.status)}
            </Badge>
            <Badge>{humanize(item.category || item.resourceType)}</Badge>
            {item.rxNorm?.code && <Badge>RxNorm {item.rxNorm.code}</Badge>}
          </div>
        </div>
        <div className="shrink-0 text-sm text-gray-500">
          {formatDate(item.startDate || item.stopDate)}
        </div>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {item.dose && <Detail label="Dose" value={item.dose} />}
        {item.frequency && <Detail label="Frequency" value={item.frequency} />}
        {item.route && <Detail label="Route" value={item.route} />}
        {item.adherence && (
          <Detail label="Adherence" value={humanize(item.adherence)} />
        )}
      </dl>

      <div className="mt-4 grid gap-2 text-sm text-gray-700">
        {item.conditionReason && (
          <InlineFact label="Why" value={item.conditionReason} />
        )}
        {item.source.label && (
          <InlineFact label="Source" value={sourceLabel(item.source)} />
        )}
        {item.conditionalInstructions && (
          <InlineFact label="Condition" value={item.conditionalInstructions} />
        )}
        {item.stopReason && (
          <InlineFact label="Stopped because" value={item.stopReason} />
        )}
      </div>

      <button
        type="button"
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        onClick={() => setIsExpanded((value) => !value)}
        aria-expanded={isExpanded}
      >
        <ChevronDownIcon
          className={[
            'h-4 w-4 transition-transform',
            isExpanded ? 'rotate-180' : '',
          ].join(' ')}
        />
        History and details
      </button>

      {isExpanded && (
        <div className="mt-4 grid gap-4 border-t border-gray-200 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
          <HistoryList events={item.history} />
          <DetailPanel item={item} />
        </div>
      )}
    </article>
  );
}

function HistoryList({
  events,
}: {
  events: MedicationTimelineItem['history'];
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900">
        Medication history
      </h4>
      <ol className="mt-3 space-y-3">
        {events.map((event) => (
          <li
            key={`${event.type}-${event.date || 'undated'}-${event.label}`}
            className="flex gap-3"
          >
            <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-600" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{event.label}</p>
              <p className="text-xs text-gray-500">{formatDate(event.date)}</p>
              {event.notes && event.notes.length > 0 && (
                <p className="mt-1 whitespace-pre-line text-sm text-gray-700">
                  {event.notes.join('\n')}
                </p>
              )}
              {event.source?.label && (
                <p className="mt-1 text-xs font-medium text-gray-500">
                  Source: {sourceLabel(event.source)}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function DetailPanel({ item }: { item: MedicationViewItem }) {
  return (
    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <h4 className="text-sm font-semibold text-gray-900">Record details</h4>
      <dl className="mt-3 grid gap-3">
        {item.startDate && <Detail label="Start date" value={item.startDate} />}
        {item.stopDate && <Detail label="Stop date" value={item.stopDate} />}
        {item.rxNorm?.system && (
          <Detail label="Code system" value={item.rxNorm.system} />
        )}
        <Detail label="FHIR resource" value={humanize(item.resourceType)} />
      </dl>
      {item.nutritionFacts.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Nutrition
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {item.nutritionFacts.map((fact) => (
              <Badge key={`${fact.label}-${fact.value}`}>
                {fact.label}: {fact.value}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {item.notes.length > 0 && (
        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-gray-700">
          {item.notes.join('\n')}
        </p>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm text-gray-900">{value}</dd>
    </div>
  );
}

function InlineFact({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="font-semibold text-gray-900">{label}:</span> {value}
    </p>
  );
}

function Badge({
  children,
  tone = 'gray',
}: {
  children: ReactNode;
  tone?: 'gray' | 'green' | 'yellow' | 'red' | 'blue';
}) {
  const classes = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-800',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-blue-50 text-blue-700',
  };

  return (
    <span
      className={[
        'rounded-md px-2 py-1 text-xs font-medium',
        classes[tone],
      ].join(' ')}
    >
      {children}
    </span>
  );
}

function ReconciliationBadge({
  state,
}: {
  state: MedicationReconciliationState;
}) {
  const tone =
    state === 'verified'
      ? 'green'
      : state === 'unknown'
        ? 'gray'
        : state === 'patient-says-not-taking' || state === 'conflicting-sources'
          ? 'red'
          : 'yellow';

  return <Badge tone={tone}>{humanize(state)}</Badge>;
}

function toMedicationViewItem(
  item: MedicationTimelineItem,
): MedicationViewItem {
  const nutritionFacts = nutritionFactsFrom(item);
  const group = classifyGroup(item, nutritionFacts);

  return {
    ...item,
    group,
    nutritionFacts,
  };
}

function classifyGroup(
  item: MedicationTimelineItem,
  nutritionFacts: NutritionFact[],
): MedicationGroup {
  const searchable = `${item.category || ''} ${item.name}`.toLowerCase();
  if (
    nutritionFacts.length > 0 ||
    ['supplement', 'vitamin', 'mineral', 'herbal'].some((word) =>
      searchable.includes(word),
    )
  ) {
    return 'supplements';
  }
  if (
    item.stopDate ||
    ['stopped', 'completed', 'entered-in-error'].includes(item.status)
  ) {
    return 'stopped';
  }
  if (
    item.conditionalInstructions ||
    item.resourceType === 'MedicationRequest' ||
    item.resourceType === 'MedicationOrder' ||
    ['intended', 'on-hold', 'unknown'].includes(item.status)
  ) {
    return 'planned';
  }
  if (item.reconciliationState === 'needs-review') return 'needsReview';
  if (item.status === 'active') return 'current';
  return 'needsReview';
}

function nutritionFactsFrom(item: MedicationTimelineItem): NutritionFact[] {
  const facts: NutritionFact[] = [];
  const raw = item.document.data_record.raw as any;
  const resource = raw?.resource || raw || {};
  const rawFacts = raw?.nutrition_facts || raw?.nutritionFacts;

  if (Array.isArray(rawFacts)) {
    rawFacts.forEach((fact: any) => {
      const label = fact.label || fact.name || fact.nutrient;
      const value = fact.value || fact.amount || fact.text;
      if (label && value) facts.push({ label, value: String(value) });
    });
  }

  resource.ingredient?.forEach((ingredient: any) => {
    const label =
      textFromCodeableConcept(ingredient.itemCodeableConcept) ||
      referenceDisplay(ingredient.itemReference);
    const value = ratioText(ingredient.strength);
    if (label) facts.push({ label, value: value || 'ingredient' });
  });

  const vitaminMatch = item.notes
    .join('\n')
    .match(
      /\b(vitamin\s+[a-z0-9]+|magnesium|omega-?3|zinc|calcium|iron|folate)\b[^,\n;]*/gi,
    );
  vitaminMatch?.forEach((value) => {
    facts.push({ label: value.split(/\s+/).slice(0, 2).join(' '), value });
  });

  return facts;
}

function textFromCodeableConcept(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  return value.text || value.coding?.[0]?.display || value.coding?.[0]?.code;
}

function referenceDisplay(value: any): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  return value.display || value.reference;
}

function ratioText(value: any) {
  if (!value) return undefined;
  const numerator = value.numerator
    ? `${value.numerator.value || ''} ${
        value.numerator.unit || value.numerator.code || ''
      }`.trim()
    : undefined;
  const denominator = value.denominator
    ? `${value.denominator.value || ''} ${
        value.denominator.unit || value.denominator.code || ''
      }`.trim()
    : undefined;
  return [numerator, denominator].filter(Boolean).join(' / ') || undefined;
}

function statusTone(status: string): 'gray' | 'green' | 'yellow' | 'red' {
  if (status === 'active') return 'green';
  if (['intended', 'on-hold', 'unknown'].includes(status)) return 'yellow';
  if (['stopped', 'entered-in-error'].includes(status)) return 'red';
  return 'gray';
}

function sectionTitle(filter: FilterChip['id']) {
  const selected = FILTERS.find((item) => item.id === filter);
  return selected?.label || 'Medications';
}

function humanize(value: string) {
  return value.replace(/[-_]/g, ' ');
}

function sourceLabel(source: MedicationTimelineItem['source']) {
  return [source.label, source.type && humanize(source.type)]
    .filter(Boolean)
    .join(' - ');
}

function formatDate(date?: string) {
  if (!date) return 'Undated';
  try {
    return format(parseISO(date), 'MMM d, yyyy');
  } catch {
    return date;
  }
}
