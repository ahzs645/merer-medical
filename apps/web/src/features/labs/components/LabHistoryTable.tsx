import { safeFormatDate } from '../../../shared/utils/dateFormatters';
import { getReferenceRangeDisplay } from '../../timeline/utils/fhirpathParsers';
import { LabGroup, ReportLink } from '../types';
import { formatLabValue } from '../utils/labFormatters';
import {
  getLabResultDetail,
  getLabResultStatusClass,
} from '../utils/labResultDetails';
import { LabReferenceRange } from './LabReferenceRange';
import { LinkedReportList } from './LinkedReportList';

export function LabHistoryTable({
  group,
  reportsByObservationId,
  onRowClick,
}: {
  group: LabGroup;
  reportsByObservationId: Map<string, ReportLink[]>;
  onRowClick?: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-md bg-white ring-1 ring-gray-200">
      <div className="hidden grid-cols-[minmax(8rem,0.8fr)_minmax(8rem,0.7fr)_minmax(8rem,0.7fr)_minmax(10rem,1fr)_minmax(12rem,1.1fr)_minmax(12rem,1.2fr)] gap-3 border-b border-gray-200 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 md:grid">
        <div>Date</div>
        <div>Value</div>
        <div>Flag</div>
        <div>Range</div>
        <div>Comment</div>
        <div>Report</div>
      </div>
      <div className="divide-y divide-gray-100">
        {group.labs.map((lab) => {
          const reports =
              reportsByObservationId.get(lab.metadata?.id || '') || [],
            detail = getLabResultDetail(lab);

          return (
            <button
              key={lab.id}
              type="button"
              onClick={onRowClick}
              className="grid w-full gap-3 px-3 py-2 text-left hover:bg-blue-50 md:grid-cols-[minmax(8rem,0.8fr)_minmax(8rem,0.7fr)_minmax(8rem,0.7fr)_minmax(10rem,1fr)_minmax(12rem,1.1fr)_minmax(12rem,1.2fr)]"
            >
              <div className="text-xs font-medium text-gray-900">
                {safeFormatDate(lab.metadata?.date, 'PP', 'Unknown')}
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-900">
                  {formatLabValue(lab) || 'No value'}
                </div>
              </div>
              <div
                className={`text-xs font-semibold ${getLabResultStatusClass(
                  detail.status,
                )}`}
              >
                {detail.statusLabel}
              </div>
              <LabReferenceRange
                range={getReferenceRangeDisplay(lab)}
                label="Source range"
              />
              <div className="text-xs text-gray-700">
                {detail.comments[0] || 'None recorded'}
              </div>
              <div className="text-xs">
                <LinkedReportList reports={reports} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
