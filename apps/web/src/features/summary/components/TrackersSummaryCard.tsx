import { Disclosure, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useRxDb } from '../../../app/providers/RxDbProvider';
import { useUser } from '../../../app/providers/UserProvider';
import { Routes as AppRoutes } from '../../../Routes';
import { listWorkflowRecords } from '../../../repositories/WorkflowRecordRepository';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { safeFormatDate } from '../../../shared/utils/dateFormatters';
import { CardBase } from '../../connections/components/CardBase';
import {
  TRACKER_ENTRY_KIND,
  TRACKER_KINDS,
  type TrackerEntry,
} from '../../trackers/trackerTypes';

/**
 * Surfaces patient-logged tracker entries (symptoms, vitals, mood, sleep,
 * activity) on the Summary dashboard. Trackers used to live only on their own
 * Utilities tab and never appeared anywhere else; this gives that
 * patient-generated data a home on the main dashboard. Renders nothing when
 * there are no entries.
 */
export function TrackersSummaryCard() {
  const db = useRxDb();
  const user = useUser();
  const { t } = useInterfaceLanguage();
  const [entries, setEntries] = useState<TrackerEntry[]>([]);

  useEffect(() => {
    let mounted = true;
    listWorkflowRecords<TrackerEntry>(db, user.id, TRACKER_ENTRY_KIND).then(
      (records) => {
        if (!mounted) return;
        setEntries(
          records
            .map((record) => record.payload)
            .sort(
              (a, b) =>
                new Date(b.recordedAt).getTime() -
                new Date(a.recordedAt).getTime(),
            ),
        );
      },
    );
    return () => {
      mounted = false;
    };
  }, [db, user.id]);

  if (entries.length === 0) return null;

  const recent = entries.slice(0, 5);
  const counts = TRACKER_KINDS.map((item) => ({
    ...item,
    count: entries.filter((entry) => entry.kind === item.kind).length,
  })).filter((item) => item.count > 0);

  return (
    <div className="col-span-6 sm:col-span-3">
      <Disclosure defaultOpen={true}>
        {({ open }) => (
          <>
            <Disclosure.Button className="w-full font-bold">
              <div className="flex w-full items-center justify-between py-6 text-xl font-extrabold">
                {t('Trackers')}
                <ChevronDownIcon
                  className={`h-8 w-8 rounded duration-150 active:scale-95 active:bg-slate-50 ${
                    open ? 'rotate-180 transform' : ''
                  }`}
                />
              </div>
            </Disclosure.Button>
            <Transition
              enter="transition duration-100 ease-out"
              enterFrom="transform scale-95 opacity-0"
              enterTo="transform scale-100 opacity-100"
              leave="transition duration-75 ease-out"
              leaveFrom="transform scale-100 opacity-100"
              leaveTo="transform scale-95 opacity-0"
            >
              <Disclosure.Panel>
                <CardBase>
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap gap-2">
                      {counts.map((item) => (
                        <span
                          key={item.kind}
                          className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700"
                        >
                          {t(item.label)}
                          <span className="font-bold">{item.count}</span>
                        </span>
                      ))}
                    </div>
                    <ul className="divide-y divide-gray-100">
                      {recent.map((entry) => (
                        <Fragment key={entry.id}>
                          <li className="flex items-start justify-between gap-3 py-2">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900 md:text-base">
                                {entry.label}
                              </p>
                              <p className="text-sm text-gray-600">
                                {entry.value}
                                {entry.unit ? ` ${entry.unit}` : ''}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs text-gray-400">
                              {safeFormatDate(entry.recordedAt, 'PP', '')}
                            </span>
                          </li>
                        </Fragment>
                      ))}
                    </ul>
                    <Link
                      to={AppRoutes.Trackers}
                      className="mt-1 inline-flex min-h-[44px] items-center text-sm font-semibold text-primary-700 hover:text-primary-900"
                    >
                      {t('Open trackers')}
                    </Link>
                  </div>
                </CardBase>
              </Disclosure.Panel>
            </Transition>
          </>
        )}
      </Disclosure>
    </div>
  );
}
