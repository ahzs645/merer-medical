import { Link, Outlet, useMatch } from 'react-router-dom';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

import { Routes as AppRoutes } from '../../Routes';
import { RecordsSideNav } from './RecordsSideNav';
import { RecordCountsProvider } from './useRecordCounts';

/**
 * Records shell. On wide viewports a grouped vertical side nav shows every
 * category at once; on narrow viewports the index route is a browse hub and
 * sub-pages get a "back to all records" affordance (drill-in) — replacing the
 * horizontal 19-tab strip that never fit on screen.
 */
export function RecordsLayout() {
  const atRoot = !!useMatch(AppRoutes.Records);

  return (
    <RecordCountsProvider>
      <div className="flex h-full min-h-0 bg-gray-50">
        <aside className="hidden w-60 shrink-0 overflow-y-auto border-r border-gray-200 bg-white lg:block">
          <RecordsSideNav />
        </aside>
        {/* min-w-0: a flex item defaults to min-width:auto, so without this the
            column grows to its widest descendant instead of shrinking, and the
            inner overflow-x-auto strips stretch the page sideways on phones. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {!atRoot && (
            <div className="border-b border-gray-200 bg-white px-3 lg:hidden">
              <Link
                to={AppRoutes.Records}
                className="text-primary-700 hover:text-primary-900 -mx-2 inline-flex min-h-[44px] items-center gap-1 px-2 text-sm font-medium"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                All records
              </Link>
            </div>
          )}
          <div className="min-h-0 min-w-0 flex-1">
            <Outlet />
          </div>
        </div>
      </div>
    </RecordCountsProvider>
  );
}
