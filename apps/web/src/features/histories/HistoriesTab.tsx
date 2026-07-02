import { useEffect, useState, type ComponentType } from 'react';
import {
  ClipboardDocumentListIcon,
  ScissorsIcon,
  UserGroupIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { Routes as AppRoutes } from '../../Routes';
import { AppPage } from '../../shared/components/AppPage';
import { BannerAddLink } from '../../shared/components/BannerAddLink';
import { GenericBanner } from '../../shared/components/GenericBanner';
import { ErrorPanel } from '../../shared/components/StatusPanel';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { firstText, isRecord, periodStart } from '../../shared/utils/fhirText';

interface HistoryItem {
  id: string;
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

function isSocialHistory(resource: Record<string, unknown>): boolean {
  const category = resource['category'];
  const text = JSON.stringify(category ?? '').toLowerCase();
  return text.includes('social');
}

function useHistoriesData() {
  const db = useRxDb();
  const user = useUser();
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
          title:
            doc.metadata?.display_name || firstText(r['code']) || 'Observation',
          detail:
            firstText(r['valueCodeableConcept']) ||
            (typeof r['valueString'] === 'string'
              ? (r['valueString'] as string)
              : undefined),
          date: (r['effectiveDateTime'] as string) || doc.metadata?.date,
        }));

      setData({ medical, surgical, family: familyItems, social });
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
  }, [db, user.id]);

  return { data, status, error };
}

const SECTIONS: {
  key: keyof HistoriesData;
  title: string;
  icon: ComponentType<{ className?: string }>;
  empty: string;
}[] = [
  {
    key: 'medical',
    title: 'Medical history',
    icon: ClipboardDocumentListIcon,
    empty: 'No conditions recorded.',
  },
  {
    key: 'surgical',
    title: 'Surgical & procedure history',
    icon: ScissorsIcon,
    empty: 'No procedures recorded.',
  },
  {
    key: 'family',
    title: 'Family history',
    icon: UsersIcon,
    empty: 'No family history recorded.',
  },
  {
    key: 'social',
    title: 'Social history',
    icon: UserGroupIcon,
    empty: 'No social history recorded.',
  },
];

export function HistoriesTab() {
  const { data, status, error } = useHistoriesData();

  return (
    <AppPage
      banner={
        <GenericBanner
          text="Histories"
          action={
            <BannerAddLink to={AppRoutes.AddRecord} label="Add history" />
          }
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
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  items: HistoryItem[];
  empty: string;
  loading: boolean;
}) {
  return (
    <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-5 w-5 text-gray-500" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
          {title}
        </h2>
        {!loading && (
          <span className="ml-auto text-xs text-gray-400">{items.length}</span>
        )}
      </div>
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm italic text-gray-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 py-2"
            >
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
                <span className="shrink-0 text-xs text-gray-400">
                  {safeFormatDate(item.date, 'PP', '')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
