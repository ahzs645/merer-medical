import { useEffect, useState } from 'react';
import { FlagIcon } from '@heroicons/react/24/outline';

import { useRxDb } from '../../app/providers/RxDbProvider';
import { useUser } from '../../app/providers/UserProvider';
import { Routes as AppRoutes } from '../../Routes';
import { ClinicalDocument } from '../../models/clinical-document/ClinicalDocument.type';
import { AppPage } from '../../shared/components/AppPage';
import { BannerAddLink } from '../../shared/components/BannerAddLink';
import { GenericBanner } from '../../shared/components/GenericBanner';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { getFhirResource } from '../../shared/utils/fhirResource';
import { firstText, isRecord } from '../../shared/utils/fhirText';

interface GoalItem {
  id: string;
  description: string;
  status?: string;
  achievement?: string;
  addresses: string[];
  startDate?: string;
}

function useGoals() {
  const db = useRxDb();
  const user = useUser();
  const [items, setItems] = useState<GoalItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'success'>('loading');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setStatus('loading');
      const docs = await db.clinical_documents
        .find({
          selector: {
            user_id: user.id,
            'data_record.resource_type': 'goal',
          },
        })
        .exec();
      if (!mounted) return;
      setItems(
        docs.map((doc) => {
          const d = doc.toMutableJSON() as ClinicalDocument;
          const r = getFhirResource<Record<string, unknown>>(d);
          const addresses = Array.isArray(r['addresses'])
            ? (r['addresses'] as unknown[])
                .map((a) =>
                  isRecord(a) ? (a['display'] as string) : undefined,
                )
                .filter((x): x is string => Boolean(x))
            : [];
          return {
            id: d.id,
            description:
              firstText(r['description']) || d.metadata?.display_name || 'Goal',
            status: firstText(r['lifecycleStatus']) || firstText(r['status']),
            achievement: firstText(r['achievementStatus']),
            addresses,
            startDate: (r['startDate'] as string) || d.metadata?.date,
          };
        }),
      );
      setStatus('success');
    }
    load();
    return () => {
      mounted = false;
    };
  }, [db, user.id]);

  return { items, status };
}

export function GoalsTab() {
  const { items, status } = useGoals();

  return (
    <AppPage
      banner={
        <GenericBanner
          text="Goals"
          action={
            <BannerAddLink
              to={`${AppRoutes.AddRecord}?type=goal`}
              label="Add goal"
            />
          }
        />
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-3xl gap-3 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          {status === 'loading' ? (
            <Placeholder text="Loading goals…" />
          ) : items.length === 0 ? (
            <Placeholder text="No health goals recorded yet." icon />
          ) : (
            items.map((item) => (
              <article
                key={item.id}
                className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words text-base font-semibold text-gray-900">
                      {item.description}
                    </h3>
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
              </article>
            ))
          )}
        </div>
      </div>
    </AppPage>
  );
}

function Placeholder({ text, icon }: { text: string; icon?: boolean }) {
  return (
    <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
      {icon && (
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-700">
          <FlagIcon className="h-6 w-6" />
        </div>
      )}
      {text}
    </div>
  );
}
