import { Outlet, useLocation } from 'react-router-dom';

import { Routes as AppRoutes } from '../../Routes';
import { UtilitiesToolNav } from './UtilitiesToolNav';

export function UtilitiesLayout() {
  // The hub *is* the tool list, with a description under every entry. Showing
  // the tool picker above it repeats that list twice on one screen — and on a
  // phone the picker's own label reads "All tools" while the page beneath it
  // is already all the tools. The picker is for moving between tools, so it
  // starts once you are in one.
  const onHub =
    useLocation().pathname.replace(/\/+$/, '').endsWith(AppRoutes.Utilities);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      {!onHub && (
        <div className="border-b border-gray-200 bg-white px-3 print:hidden sm:px-6 lg:px-8">
          <UtilitiesToolNav />
        </div>
      )}
      {/* min-w-0: without it this column grows to its widest descendant and
          drags the whole page sideways on phones. */}
      <div className="min-h-0 min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
