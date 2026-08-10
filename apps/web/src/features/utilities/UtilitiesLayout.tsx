import { Outlet } from 'react-router-dom';

import { UtilitiesToolNav } from './UtilitiesToolNav';

export function UtilitiesLayout() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-3 sm:px-6 lg:px-8">
        <UtilitiesToolNav />
      </div>
      {/* min-w-0: without it this column grows to its widest descendant and
          drags the whole page sideways on phones. */}
      <div className="min-h-0 min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
