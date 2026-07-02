import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { AppPage } from '../../shared/components/AppPage';
import { GenericBanner } from '../../shared/components/GenericBanner';
import {
  EmptyState,
  SearchInput,
} from '../../shared/components/records/RecordListPage';
import { RECORD_GROUPS } from './recordCategories';
import { countForCategory, useRecordCounts } from './useRecordCounts';

/**
 * Records landing page: a searchable "browse" hub of grouped category cards
 * with approximate counts (the Apple Health Browse pattern). Replaces the old
 * redirect straight to Labs and gives the low-discoverability categories
 * (Referrals, Histories, Providers, …) a real home.
 */
export function RecordsHub() {
  const [query, setQuery] = useState('');
  const { counts } = useRecordCounts();
  const q = query.trim().toLowerCase();

  const groups = useMemo(() => {
    if (!q) return RECORD_GROUPS;
    return RECORD_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.label.toLowerCase().includes(q)),
    })).filter((group) => group.items.length > 0);
  }, [q]);

  return (
    <AppPage banner={<GenericBanner text="Records" />}>
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search records"
            label="Search record categories"
          />

          {groups.length === 0 ? (
            <EmptyState text={`No record categories match “${query}”.`} />
          ) : (
            groups.map((group) => (
              <section key={group.heading}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {group.heading}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const count = countForCategory(item, counts);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="hover:ring-primary-300 hover:bg-primary-50 flex items-center gap-3 rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200"
                      >
                        <span className="bg-primary-50 text-primary-700 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-gray-900">
                            {item.label}
                          </span>
                          {typeof count === 'number' && (
                            <span className="block text-xs text-gray-500">
                              {count} record{count === 1 ? '' : 's'}
                            </span>
                          )}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </AppPage>
  );
}
