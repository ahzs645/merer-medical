import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Routes as AppRoutes } from '../../Routes';
import { AppPage } from '../../shared/components/AppPage';
import { EmptyState } from '../../shared/components/records/RecordListPage';
import {
  RecordHeaderLink,
  RecordPageHeader,
} from '../../shared/components/records/RecordPageHeader';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { ALL_RECORD_CATEGORIES, RECORD_GROUPS } from './recordCategories';
import {
  categoryCount,
  countForCategory,
  latestRecordDate,
  useRecordCounts,
  type CategoryCount,
} from './useRecordCounts';

/** How many categories the wide-viewport overview ranks before it stops. */
const OVERVIEW_ROWS = 6;

/** Sub-label under a category name: a tally, or why there isn't one. */
function countText(count: CategoryCount): string {
  switch (count.kind) {
    case 'count':
      return `${count.value} record${count.value === 1 ? '' : 's'}`;
    case 'pending':
      return 'Counting…';
    case 'unavailable':
      return 'Count unavailable';
    default:
      return 'Not counted';
  }
}

/**
 * Records landing page: a searchable "browse" hub of grouped category cards
 * with approximate counts (the Apple Health Browse pattern). Replaces the old
 * redirect straight to Labs and gives the low-discoverability categories
 * (Referrals, Histories, Providers, …) a real home.
 *
 * The card grid is the only Records navigation below `lg`. From `lg` up the
 * side rail already lists the same categories, groups and counts immediately
 * to the left, so the grid only appears there as search results and browsing
 * gets an overview the rail can't give instead.
 */
export function RecordsHub() {
  const [query, setQuery] = useState('');
  const recordCounts = useRecordCounts();
  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  const groups = useMemo(() => {
    if (!q) return RECORD_GROUPS;
    return RECORD_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.label.toLowerCase().includes(q)),
    })).filter((group) => group.items.length > 0);
  }, [q]);

  return (
    <AppPage
      banner={
        <RecordPageHeader
          title="Records"
          search={{
            query,
            onChange: setQuery,
            placeholder: 'Search records',
            label: 'Search record categories',
          }}
          // The hub is where "add a record of some kind" belongs: every
          // category page already carries its own typed add button, and this
          // is the one page that covers the types that don't have one.
          action={
            <RecordHeaderLink to={AppRoutes.AddRecord} label="Add record" />
          }
        />
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          {groups.length === 0 ? (
            <EmptyState text={`No record categories match “${query}”.`} />
          ) : (
            <>
              {!searching && <RecordsOverview />}
              <div className={`grid gap-6 ${searching ? '' : 'lg:hidden'}`}>
                {groups.map((group) => (
                  <section key={group.heading}>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {group.heading}
                    </h2>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const count = categoryCount(item, recordCounts);
                        return (
                          <Link
                            key={item.to}
                            to={item.to}
                            className="hover:ring-primary-300 hover:bg-primary-50 flex items-center gap-2.5 rounded-md bg-white p-3 shadow-sm ring-1 ring-gray-200 sm:gap-3 sm:p-4"
                          >
                            <span className="bg-primary-50 text-primary-700 flex h-9 w-9 shrink-0 items-center justify-center rounded-full sm:h-10 sm:w-10">
                              <Icon className="h-5 w-5" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold leading-snug text-gray-900">
                                {item.label}
                              </span>
                              <span
                                className={`block text-xs ${
                                  count.kind === 'count'
                                    ? 'text-gray-500'
                                    : 'text-gray-400'
                                }`}
                                title={
                                  count.kind === 'uncounted'
                                    ? 'This view combines several kinds of record, so it has no single tally.'
                                    : undefined
                                }
                              >
                                {countText(count)}
                              </span>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AppPage>
  );
}

/**
 * Wide-viewport landing. Re-listing the categories would just mirror the side
 * rail, so this ranks the categories that actually hold records by their most
 * recent record — ordering and dates the rail doesn't show.
 */
function RecordsOverview() {
  const { counts, latest, status } = useRecordCounts();

  const recent = useMemo(
    () =>
      ALL_RECORD_CATEGORIES.map((category) => ({
        category,
        count: countForCategory(category, counts) ?? 0,
        date: latestRecordDate(category, latest),
      }))
        .filter((entry) => entry.count > 0)
        .sort(
          (a, b) =>
            (b.date ? Date.parse(b.date) : 0) -
              (a.date ? Date.parse(a.date) : 0) || b.count - a.count,
        )
        .slice(0, OVERVIEW_ROWS),
    [counts, latest],
  );

  return (
    <section className="hidden gap-6 lg:grid">
      <div className="rounded-md bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-base font-semibold text-gray-900">
          What is in Records
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Everything imported from your connected providers: results, your
          health profile, visits and care, documents, and the dental and
          optometry workspaces. Pick a category from the list on the left, or
          search above to jump straight to one.
        </p>
        {status === 'success' && recent.length === 0 && (
          <p className="mt-3 text-sm text-gray-600">
            Nothing has been imported yet.{' '}
            <Link
              to={AppRoutes.AddConnection}
              className="text-primary-700 hover:text-primary-900 font-medium underline"
            >
              Add a patient portal
            </Link>{' '}
            to start pulling in your history.
          </p>
        )}
      </div>

      {recent.length > 0 && (
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Most recent records
          </h2>
          <ul className="divide-y divide-gray-200 overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-gray-200">
            {recent.map(({ category, count, date }) => {
              const Icon = category.icon;
              return (
                <li key={category.to}>
                  <Link
                    to={category.to}
                    className="hover:bg-primary-50 flex items-center gap-3 px-4 py-3"
                  >
                    <span className="bg-primary-50 text-primary-700 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-gray-900">
                        {category.label}
                      </span>
                      <span className="block text-xs text-gray-500">
                        {count} record{count === 1 ? '' : 's'}
                      </span>
                    </span>
                    {date && (
                      <span className="shrink-0 text-xs text-gray-500">
                        Latest {safeFormatDate(date, 'PP')}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-gray-500">
            Combined views such as Labs, Vitals, Imaging and All results are not
            tallied, so they never appear here — open them from the list on the
            left.
          </p>
        </div>
      )}
    </section>
  );
}
