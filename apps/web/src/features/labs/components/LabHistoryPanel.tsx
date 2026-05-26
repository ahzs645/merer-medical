import { useState } from 'react';

import { ChartBarIcon, TableCellsIcon } from '@heroicons/react/24/outline';

import { LabGroup, LabViewMode, ReportLink } from '../types';
import { LabHistoryChart } from './LabHistoryChart';
import { LabHistoryTable } from './LabHistoryTable';

export function LabHistoryPanel({
  group,
  reportsByObservationId,
}: {
  group: LabGroup;
  reportsByObservationId: Map<string, ReportLink[]>;
}) {
  const [view, setView] = useState<LabViewMode>('TABLE');

  return (
    <div className="border-t border-gray-200 bg-gray-50 px-3 py-3 sm:px-4">
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-900">
            Result history
          </h3>
          <p className="text-xs text-gray-600">
            Showing all {group.labs.length} recorded values, newest first.
          </p>
        </div>
        <div className="inline-flex w-fit rounded-md shadow-sm ring-1 ring-gray-300">
          <button
            type="button"
            onClick={() => setView('TABLE')}
            className={`inline-flex items-center gap-1 rounded-l-md px-2.5 py-1.5 text-xs font-semibold ${
              view === 'TABLE'
                ? 'bg-primary-700 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <TableCellsIcon className="h-4 w-4" />
            History
          </button>
          <button
            type="button"
            onClick={() => setView('GRAPH')}
            className={`inline-flex items-center gap-1 rounded-r-md px-2.5 py-1.5 text-xs font-semibold ${
              view === 'GRAPH'
                ? 'bg-primary-700 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ChartBarIcon className="h-4 w-4" />
            Graph
          </button>
        </div>
      </div>
      {view === 'GRAPH' ? (
        <div className="rounded-md bg-white p-3 ring-1 ring-gray-200">
          <LabHistoryChart group={group} heightClassName="h-80" />
        </div>
      ) : (
        <LabHistoryTable
          group={group}
          reportsByObservationId={reportsByObservationId}
          onRowClick={() => setView('GRAPH')}
        />
      )}
    </div>
  );
}
