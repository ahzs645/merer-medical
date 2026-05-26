import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

import { safeFormatDate } from '../../../shared/utils/dateFormatters';
import {
  getReferenceRangeString,
  isOutOfRangeResult,
} from '../../timeline/utils/fhirpathParsers';
import { LabGroup, ReportLink } from '../types';
import { formatLabValue, getLabDetailLink } from '../utils/labFormatters';
import { saveLabsScrollPosition } from '../utils/labsPageState';
import { LabHistoryPanel } from './LabHistoryPanel';
import { LabReferenceRange } from './LabReferenceRange';
import { LinkedReportList } from './LinkedReportList';

export function LabsTable({
  groups,
  reportsByObservationId,
  title,
  description,
}: {
  groups: LabGroup[];
  reportsByObservationId: Map<string, ReportLink[]>;
  title?: string;
  description?: string;
}) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  function toggleExpanded(key: string) {
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <section className="rounded-md bg-white shadow-sm ring-1 ring-gray-200">
      {title ? (
        <div className="border-b border-gray-200 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{title}</h2>
              {description ? (
                <p className="mt-1 text-sm text-gray-600">{description}</p>
              ) : null}
            </div>
            <div className="text-sm text-gray-600">
              {groups.length} lab type{groups.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <div className="min-w-[62rem] xl:min-w-full">
          <div className="grid grid-cols-[minmax(13rem,1.4fr)_minmax(7rem,0.65fr)_minmax(9rem,0.85fr)_minmax(8rem,0.7fr)_minmax(13rem,1.15fr)_minmax(7rem,0.65fr)] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <div>Lab test</div>
            <div>Latest</div>
            <div>Reference</div>
            <div>Date</div>
            <div>Linked report</div>
            <div>Status</div>
          </div>
          <div className="divide-y divide-gray-200">
            {groups.map((group) => (
              <LabTableRow
                key={group.key}
                group={group}
                expanded={expandedKeys.has(group.key)}
                onToggle={() => toggleExpanded(group.key)}
                reportsByObservationId={reportsByObservationId}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LabTableRow({
  group,
  expanded,
  onToggle,
  reportsByObservationId,
}: {
  group: LabGroup;
  expanded: boolean;
  onToggle: () => void;
  reportsByObservationId: Map<string, ReportLink[]>;
}) {
  const navigate = useNavigate();
  const latest = group.labs[0],
    latestReports = reportsByObservationId.get(latest.metadata?.id || '') || [],
    abnormalCount = group.labs.filter((lab) => isOutOfRangeResult(lab)).length;

  function openLabDetail() {
    saveLabsScrollPosition();
    navigate(getLabDetailLink(group.key));
  }

  return (
    <section>
      <div
        role="button"
        tabIndex={0}
        onClick={openLabDetail}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openLabDetail();
          }
        }}
        className="grid w-full cursor-pointer grid-cols-[minmax(13rem,1.4fr)_minmax(7rem,0.65fr)_minmax(9rem,0.85fr)_minmax(8rem,0.7fr)_minmax(13rem,1.15fr)_minmax(7rem,0.65fr)] gap-3 px-4 py-4 text-left hover:bg-blue-50"
      >
        <div className="flex min-w-0 gap-3">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
            className="mt-0.5 shrink-0 rounded p-0.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label={`${expanded ? 'Collapse' : 'Expand'} ${group.name}`}
          >
            {expanded ? (
              <ChevronDownIcon className="h-5 w-5" />
            ) : (
              <ChevronRightIcon className="h-5 w-5" />
            )}
          </button>
          <div className="min-w-0">
            <h2 className="break-words text-sm font-semibold text-gray-900">
              {group.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
              {group.code ? <span>LOINC {group.code}</span> : null}
              <span>{group.labs.length} results</span>
            </div>
          </div>
        </div>
        <div
          className={`text-sm font-semibold ${
            isOutOfRangeResult(latest) ? 'text-red-700' : 'text-gray-900'
          }`}
        >
          {formatLabValue(latest) || 'No value'}
        </div>
        <LabReferenceRange range={getReferenceRangeString(latest)} />
        <div className="text-sm text-gray-700">
          {safeFormatDate(latest.metadata?.date, 'PP', 'Unknown')}
        </div>
        <div className="text-sm">
          <LinkedReportList reports={latestReports} />
        </div>
        <div className="text-sm">
          {abnormalCount > 0 ? (
            <span className="font-semibold text-red-700">
              {abnormalCount} high/low
            </span>
          ) : (
            <span className="text-gray-600">In range</span>
          )}
        </div>
      </div>
      {expanded ? (
        <LabHistoryPanel
          group={group}
          reportsByObservationId={reportsByObservationId}
        />
      ) : null}
    </section>
  );
}
