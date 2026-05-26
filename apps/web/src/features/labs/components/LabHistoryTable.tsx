import { safeFormatDate } from '../../../shared/utils/dateFormatters';
import {
  getInterpretationText,
  getReferenceRangeString,
  isOutOfRangeResult,
} from '../../timeline/utils/fhirpathParsers';
import { LabGroup, ReportLink } from '../types';
import { formatLabValue } from '../utils/labFormatters';
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
      <div className="hidden grid-cols-[minmax(8rem,0.8fr)_minmax(8rem,0.7fr)_minmax(10rem,1fr)_minmax(12rem,1.2fr)] gap-3 border-b border-gray-200 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 md:grid">
        <div>Date</div>
        <div>Value</div>
        <div>Range</div>
        <div>Report</div>
      </div>
      <div className="divide-y divide-gray-100">
        {group.labs.map((lab) => {
          const reports =
              reportsByObservationId.get(lab.metadata?.id || '') || [],
            abnormal = isOutOfRangeResult(lab),
            interpretation = getInterpretationText(lab);

          return (
            <button
              key={lab.id}
              type="button"
              onClick={onRowClick}
              className="grid w-full gap-3 px-3 py-2 text-left hover:bg-blue-50 md:grid-cols-[minmax(8rem,0.8fr)_minmax(8rem,0.7fr)_minmax(10rem,1fr)_minmax(12rem,1.2fr)]"
            >
              <div className="text-xs font-medium text-gray-900">
                {safeFormatDate(lab.metadata?.date, 'PP', 'Unknown')}
              </div>
              <div>
                <div
                  className={`text-xs font-semibold ${
                    abnormal ? 'text-red-700' : 'text-gray-900'
                  }`}
                >
                  {formatLabValue(lab) || 'No value'}
                </div>
                {interpretation ? (
                  <div
                    className={`text-xs ${
                      abnormal ? 'text-red-700' : 'text-primary-700'
                    }`}
                  >
                    {interpretation}
                  </div>
                ) : null}
              </div>
              <LabReferenceRange range={getReferenceRangeString(lab)} />
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
