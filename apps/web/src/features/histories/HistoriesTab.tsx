import { useEffect, useState, type ComponentType } from 'react';
import {
  ArrowRightIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  ScissorsIcon,
  UserGroupIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { Routes as AppRoutes } from '../../Routes';
import { AppPage } from '../../shared/components/AppPage';
import { RecordPageHeader } from '../../shared/components/records/RecordPageHeader';
import { ErrorPanel } from '../../shared/components/StatusPanel';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { firstText, isRecord, periodStart } from '../../shared/utils/fhirText';
import { useRecordChangeTick } from '../../shared/utils/recordChangeSignal';
import { buildAddRecordPath } from '../manual-entry/addRecordPath';
import { ManualRecordActions } from '../manual-entry/ManualRecordActions';
import type { ManualRecordKind } from '../manual-entry/manualRecordTypes';

interface HistoryItem {
  id: string;
  /** Kept for `ManualRecordActions`, which decides for itself whether this
   *  record was typed here or arrived from a provider. */
  document: ClinicalDocument;
  title: string;
  detail?: string;
  date?: string;
}

interface HistoriesData {
  medical: HistoryItem[];
  surgical: HistoryItem[];
  family: HistoryItem[];
  social: HistoryItem[];
}

/**
 * Most recent first, undated last. Nothing sorted these, so a section that is
 * cut off at five rows would have shown whichever five the database handed
 * back — here, a 2012 pneumonia above a 2026 diagnosis.
 */
function byDateDesc(items: HistoryItem[]): HistoryItem[] {
  return [...items].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function isSocialHistory(resource: Record<string, unknown>): boolean {
  const category = resource['category'];
  const text = JSON.stringify(category ?? '').toLowerCase();
  return text.includes('social');
}

function useHistoriesData() {
  const db = useRxDb();
  const user = useUser();
  // Refetch when a manual record is added, edited, or deleted.
  const recordChangeTick = useRecordChangeTick();
  const [data, setData] = useState<HistoriesData>({
    medical: [],
    surgical: [],
    family: [],
    social: [],
  });
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
    'loading',
  );
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setStatus('loading');
      setError(null);
      const fetch = async (rt: string) =>
        (
          await db.clinical_documents
            .find({
              selector: {
                user_id: user.id,
                'data_record.resource_type': rt,
              },
            })
            .exec()
        ).map((d) => d.toMutableJSON() as ClinicalDocument);

      const [conditions, procedures, family, observations] = await Promise.all([
        fetch('condition'),
        fetch('procedure'),
        fetch('familymemberhistory'),
        fetch('observation'),
      ]);
      if (!mounted) return;

      const medical = conditions.map((doc) => {
        const r = getFhirResource<Record<string, unknown>>(doc);
        return {
          id: doc.id,
          document: doc,
          title:
            doc.metadata?.display_name || firstText(r['code']) || 'Condition',
          detail: firstText(r['clinicalStatus']),
          date:
            (r['onsetDateTime'] as string) ||
            (r['recordedDate'] as string) ||
            doc.metadata?.date,
        };
      });

      const surgical = procedures.map((doc) => {
        const r = getFhirResource<Record<string, unknown>>(doc);
        return {
          id: doc.id,
          document: doc,
          title:
            doc.metadata?.display_name || firstText(r['code']) || 'Procedure',
          detail: firstText(r['status']),
          date:
            (r['performedDateTime'] as string) ||
            periodStart(r['performedPeriod']) ||
            doc.metadata?.date,
        };
      });

      const familyItems = family.map((doc) => {
        const r = getFhirResource<Record<string, unknown>>(doc);
        const relationship =
          firstText(r['relationship']) ||
          doc.metadata?.display_name ||
          'Relative';
        const conditionsList = Array.isArray(r['condition'])
          ? (r['condition'] as unknown[])
              .map((c) => (isRecord(c) ? firstText(c['code']) : undefined))
              .filter(Boolean)
              .join(', ')
          : undefined;
        return {
          id: doc.id,
          document: doc,
          title: relationship,
          detail: conditionsList || 'No conditions recorded',
          date: r['date'] as string | undefined,
        };
      });

      const social = observations
        .map((doc) => ({
          doc,
          r: getFhirResource<Record<string, unknown>>(doc),
        }))
        .filter(({ r }) => isSocialHistory(r))
        .map(({ doc, r }) => ({
          id: doc.id,
          document: doc,
          title:
            doc.metadata?.display_name || firstText(r['code']) || 'Observation',
          detail:
            firstText(r['valueCodeableConcept']) ||
            (typeof r['valueString'] === 'string'
              ? (r['valueString'] as string)
              : undefined),
          date: (r['effectiveDateTime'] as string) || doc.metadata?.date,
        }));

      setData({
        medical: byDateDesc(medical),
        surgical: byDateDesc(surgical),
        family: byDateDesc(familyItems),
        social: byDateDesc(social),
      });
      setStatus('success');
    }
    load().catch((e) => {
      if (!mounted) return;
      setError(e instanceof Error ? e : new Error(String(e)));
      setStatus('error');
    });
    return () => {
      mounted = false;
    };
  }, [db, user.id, recordChangeTick]);

  return { data, status, error };
}

/**
 * Each section names the manual record kind that feeds it, so the add link
 * beside it opens the right form.
 *
 * The banner used to carry a single "Add history" pointing at a bare
 * `/records/new`, which dropped you on the sixteen-card picker to work out for
 * yourself that this page is fed by four unrelated kinds. One banner button
 * can only be honest about one of them, so the choice moved to where it is
 * already made: you add to the list you are looking at.
 *
 * `home` is the page that owns the section's records, where one exists. The
 * first two sections re-list what Conditions and Procedures hold — the same
 * documents, read as an intake form — and saying so, with a way through, is
 * the difference between a summary and a third copy of the same list. Family
 * and social history have no other page, so they name none, and stay whole.
 *
 * Sections that have a home are cut to `SUMMARY_ROWS`, most recent first: the
 * medical history opened with all thirteen conditions, which filled a phone
 * screen and pushed the other three sections — the ones this page is the only
 * home for — out of sight.
 */
const SUMMARY_ROWS = 5;

const SECTIONS: {
  key: keyof HistoriesData;
  title: string;
  icon: ComponentType<{ className?: string }>;
  empty: string;
  addType: ManualRecordKind;
  addLabel: string;
  home?: { to: string; label: string };
}[] = [
  {
    key: 'medical',
    title: 'Medical history',
    icon: ClipboardDocumentListIcon,
    empty: 'No conditions recorded.',
    addType: 'condition',
    addLabel: 'Add condition',
    home: { to: AppRoutes.Conditions, label: 'Conditions' },
  },
  {
    key: 'surgical',
    title: 'Surgical & procedure history',
    icon: ScissorsIcon,
    empty: 'No procedures recorded.',
    addType: 'procedure',
    addLabel: 'Add procedure',
    home: { to: AppRoutes.Procedures, label: 'Procedures' },
  },
  {
    key: 'family',
    title: 'Family history',
    icon: UsersIcon,
    empty: 'No family history recorded.',
    addType: 'familymemberhistory',
    addLabel: 'Add family history',
  },
  {
    key: 'social',
    title: 'Social history',
    icon: UserGroupIcon,
    empty: 'No social history recorded.',
    addType: 'socialhistory',
    addLabel: 'Add social history',
  },
];

export function HistoriesTab() {
  const { data, status, error } = useHistoriesData();

  return (
    <AppPage
      banner={
        <RecordPageHeader
          title="Histories"
          description="The intake-form reading of your record: what you have had, what was done, what runs in the family, and how you live. The first two sections are the same records Conditions and Procedures hold, not a separate list."
        />
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto w-full max-w-5xl px-4 py-4 pb-24 sm:px-6 lg:px-8">
          {status === 'error' ? (
            <ErrorPanel error={error} text="Unable to load histories." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {SECTIONS.map((section) => (
                <HistorySection
                  key={section.key}
                  title={section.title}
                  icon={section.icon}
                  items={data[section.key]}
                  empty={section.empty}
                  loading={status === 'loading'}
                  addPath={buildAddRecordPath({
                    type: section.addType,
                    returnTo: AppRoutes.Histories,
                  })}
                  addLabel={section.addLabel}
                  home={section.home}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppPage>
  );
}

function HistorySection({
  title,
  icon: Icon,
  items,
  empty,
  loading,
  addPath,
  addLabel,
  home,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  items: HistoryItem[];
  empty: string;
  loading: boolean;
  addPath: string;
  addLabel: string;
  home?: { to: string; label: string };
}) {
  const shown = home ? items.slice(0, SUMMARY_ROWS) : items;
  const hidden = items.length - shown.length;

  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-5 w-5 shrink-0 text-gray-500" />
        <h2 className="min-w-0 text-sm font-semibold uppercase tracking-wide text-gray-700">
          {title}
        </h2>
        <div className="ms-auto flex shrink-0 items-center gap-2">
          {!loading && (
            <span className="text-xs text-gray-600">{items.length}</span>
          )}
          {/* The label is the accessible name in full ("Add family history");
              the four sections sit two-to-a-row, so only "Add" is drawn. */}
          <Link
            to={addPath}
            title={addLabel}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-md px-2 text-sm font-semibold text-primary-700 hover:bg-primary-50"
          >
            <PlusIcon className="h-4 w-4 shrink-0" />
            <span className="sr-only">{addLabel}</span>
            <span aria-hidden="true">Add</span>
          </Link>
        </div>
      </div>
      {loading ? (
        <p className="text-sm text-gray-600">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm italic text-gray-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {shown.map((item) => (
            <li key={item.id} className="py-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-gray-900">
                    {item.title}
                  </p>
                  {item.detail && (
                    <p className="text-xs capitalize text-gray-500">
                      {item.detail}
                    </p>
                  )}
                </div>
                {item.date && (
                  <span className="shrink-0 text-xs text-gray-600">
                    {safeFormatDate(item.date, 'PP', '')}
                  </span>
                )}
              </div>
              <ManualRecordActions item={item.document} />
            </li>
          ))}
        </ul>
      )}
      {home && !loading && (
        // Named rather than a bare "See all": the point is that these rows
        // already live somewhere with a fuller view of them, and this is the
        // way there.
        <Link
          to={home.to}
          className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-900"
        >
          {hidden > 0
            ? `${hidden} more in ${home.label}`
            : `Open ${home.label}`}
          <ArrowRightIcon className="h-4 w-4 shrink-0 rtl:rotate-180" />
        </Link>
      )}
    </section>
  );
}
