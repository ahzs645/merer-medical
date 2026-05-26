import { Link } from 'react-router-dom';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

import { safeFormatDate } from '../../../shared/utils/dateFormatters';
import { ReportLink } from '../types';
import { getTimelineDateLink } from '../utils/labFormatters';

export function LinkedReportList({ reports }: { reports: ReportLink[] }) {
  if (reports.length === 0) {
    return <span className="text-gray-500">No linked report found</span>;
  }

  return (
    <div
      className="flex flex-col gap-1"
      onClick={(event) => event.stopPropagation()}
    >
      {reports.map((report) => (
        <Link
          key={report.id}
          to={getTimelineDateLink(report.date)}
          className="inline-flex items-start gap-1.5 text-primary-700 hover:text-primary-900"
        >
          <DocumentTextIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0">
            <span className="block break-words font-medium">
              {report.displayName || 'Associated report'}
            </span>
            <span className="block text-[11px] leading-4 text-gray-600">
              {[safeFormatDate(report.date, 'PP', ''), report.performer]
                .filter(Boolean)
                .join(' - ')}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
