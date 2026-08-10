import { useMemo } from 'react';
import {
  ArrowLeftIcon,
  BeakerIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  FlagIcon,
  ScissorsIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { Link, useParams } from 'react-router-dom';

import { Routes as AppRoutes } from '../../Routes';
import { AppPage } from '../../shared/components/AppPage';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { useConditionsData } from './hooks/useConditionsData';
import { ConditionBundle, RelatedKind, RelatedRecord } from './types';

const SECTIONS: {
  kind: RelatedKind;
  title: string;
  icon: typeof BeakerIcon;
}[] = [
  { kind: 'medication', title: 'Medications', icon: ClipboardDocumentListIcon },
  { kind: 'lab', title: 'Labs & results', icon: BeakerIcon },
  {
    kind: 'careplan',
    title: 'Care plans',
    icon: ClipboardDocumentCheckIcon,
  },
  { kind: 'goal', title: 'Goals', icon: FlagIcon },
  { kind: 'procedure', title: 'Procedures', icon: ScissorsIcon },
];

function formatDate(date?: string): string {
  return safeFormatDate(date, 'PP', date || 'Undated');
}

export function ConditionDetailTab() {
  const { conditionId } = useParams<{ conditionId: string }>();
  const decodedId = conditionId ? decodeURIComponent(conditionId) : '';
  const { bundles, status } = useConditionsData();

  const bundle = useMemo(
    () => bundles.find((item) => item.id === decodedId),
    [bundles, decodedId],
  );

  return (
    <AppPage banner={<DetailHeader bundle={bundle} />}>
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          {status === 'loading' ? (
            <Placeholder text="Loading condition..." />
          ) : !bundle ? (
            <Placeholder text="This condition could not be found." />
          ) : (
            <ConditionDetail bundle={bundle} />
          )}
        </div>
      </div>
    </AppPage>
  );
}

function DetailHeader({ bundle }: { bundle?: ConditionBundle }) {
  return (
    <div className="bg-primary-800 px-3 py-4 text-white sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-3">
        <Link
          to={AppRoutes.Conditions}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary-100 hover:text-white"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          All conditions
        </Link>
        <div className="flex items-center gap-2">
          <Squares2X2Icon className="h-7 w-7 shrink-0" />
          <h1 className="text-2xl font-bold sm:text-3xl">
            {bundle?.name ?? 'Condition'}
          </h1>
        </div>
        {bundle && (
          <p className="text-sm text-primary-100">
            {bundle.related.length} related record
            {bundle.related.length === 1 ? '' : 's'}
            {bundle.source ? ` · ${bundle.source}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}

function ConditionDetail({ bundle }: { bundle: ConditionBundle }) {
  const timeline = useMemo(() => buildTimeline(bundle), [bundle]);

  return (
    <>
      <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize ring-1 ring-inset ring-gray-500/20">
            {bundle.status}
          </span>
          {bundle.topicLabels.map((label) => (
            <span
              key={label}
              className="inline-flex items-center rounded-md bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700 ring-1 ring-inset ring-primary-600/10"
            >
              {label}
            </span>
          ))}
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Onset" value={formatDate(bundle.onsetDate)} />
          <Detail label="Recorded" value={formatDate(bundle.recordedDate)} />
          <Detail label="Source" value={bundle.source || 'Unknown'} />
          <Detail
            label="Codes"
            value={bundle.codes.slice(0, 3).join(', ') || 'None'}
          />
        </dl>
      </section>

      {bundle.related.length === 0 ? (
        <Placeholder text="No related medications, labs, or care plans were found for this condition yet." />
      ) : (
        SECTIONS.map((section) => {
          const items = bundle.related.filter(
            (record) => record.kind === section.kind,
          );
          if (items.length === 0) return null;
          return (
            <RelatedSection
              key={section.kind}
              title={section.title}
              icon={section.icon}
              items={items}
            />
          );
        })
      )}

      {timeline.length > 0 && (
        <section>
          <SectionHeading icon={CalendarDaysIcon} title="Timeline" />
          <ol className="relative ml-3 border-l border-gray-200">
            {timeline.map((event) => (
              <li key={event.id} className="mb-4 ml-4">
                <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-primary-400 ring-4 ring-gray-50" />
                <time className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {formatDate(event.date)}
                </time>
                <p className="text-sm text-gray-900">{event.name}</p>
                <p className="text-xs text-gray-500">{event.detail}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

function RelatedSection({
  title,
  icon,
  items,
}: {
  title: string;
  icon: typeof BeakerIcon;
  items: RelatedRecord[];
}) {
  return (
    <section>
      <SectionHeading icon={icon} title={`${title} (${items.length})`} />
      <div className="grid gap-2">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-md bg-white p-3 shadow-sm ring-1 ring-gray-200"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="break-words text-sm font-semibold text-gray-900">
                  {item.name}
                </h4>
                <p className="mt-0.5 text-xs text-gray-500">{item.reason}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-xs text-gray-500">
                  {formatDate(item.date)}
                </span>
                <ConfidenceBadge confidence={item.confidence} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ConfidenceBadge({
  confidence,
}: {
  confidence: RelatedRecord['confidence'];
}) {
  if (confidence === 'linked') {
    return (
      <span className="inline-flex items-center rounded bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
        Linked
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
      Related
    </span>
  );
}

interface TimelineEvent {
  id: string;
  date?: string;
  name: string;
  detail: string;
}

function buildTimeline(bundle: ConditionBundle): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const onset = bundle.onsetDate || bundle.recordedDate;
  if (onset) {
    events.push({
      id: `${bundle.id}-onset`,
      date: onset,
      name: bundle.name,
      detail: 'Condition recorded',
    });
  }
  bundle.related.forEach((record) => {
    if (!record.date) return;
    events.push({
      id: record.id,
      date: record.date,
      name: record.name,
      detail: record.reason,
    });
  });
  return events
    .filter((event) => event.date)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function SectionHeading({
  icon: Icon,
  title,
}: {
  icon: typeof BeakerIcon;
  title: string;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <Icon className="h-5 w-5 text-gray-500" />
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
        {title}
      </h2>
    </div>
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

function Placeholder({ text }: { text: string }) {
  return (
    <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
      {text}
    </div>
  );
}
