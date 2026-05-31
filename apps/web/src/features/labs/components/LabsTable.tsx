import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { safeFormatDate } from '../../../shared/utils/dateFormatters';
import {
  buildLabReferenceEvaluation,
  summarizeLabGroupStatus,
} from '../enrichment/labEnrichment';
import {
  LabFlag,
  ReferenceContext,
  ReferenceOverlayMode,
} from '../enrichment/types';
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
  referenceMode,
  referenceContext,
}: {
  groups: LabGroup[];
  reportsByObservationId: Map<string, ReportLink[]>;
  title?: string;
  description?: string;
  referenceMode: ReferenceOverlayMode;
  referenceContext?: ReferenceContext;
}) {
  const { t } = useInterfaceLanguage();
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
    <section className="overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-gray-200">
      {title ? (
        <div className="border-b border-gray-200 px-3 py-3 sm:px-5 sm:py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {t(title)}
              </h2>
              {description ? (
                <p className="mt-1 text-sm text-gray-600">{t(description)}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      <div className="divide-y divide-gray-200 md:hidden">
        {groups.map((group) => (
          <LabMobileRow
            key={group.key}
            group={group}
            expanded={expandedKeys.has(group.key)}
            onToggle={() => toggleExpanded(group.key)}
            reportsByObservationId={reportsByObservationId}
            referenceMode={referenceMode}
            referenceContext={referenceContext}
          />
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <div className="min-w-[62rem] xl:min-w-full">
          <div className="grid grid-cols-[minmax(13rem,1.4fr)_minmax(7rem,0.65fr)_minmax(9rem,0.85fr)_minmax(8rem,0.7fr)_minmax(13rem,1.15fr)_minmax(7rem,0.65fr)] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <div>{t('Lab test')}</div>
            <div>{t('Latest')}</div>
            <div>{t('Reference')}</div>
            <div>{t('Date')}</div>
            <div>{t('Linked report')}</div>
            <div>{t('Status')}</div>
          </div>
          <div className="divide-y divide-gray-200">
            {groups.map((group) => (
              <LabTableRow
                key={group.key}
                group={group}
                expanded={expandedKeys.has(group.key)}
                onToggle={() => toggleExpanded(group.key)}
                reportsByObservationId={reportsByObservationId}
                referenceMode={referenceMode}
                referenceContext={referenceContext}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function LabMobileRow({
  group,
  expanded,
  onToggle,
  reportsByObservationId,
  referenceMode,
  referenceContext,
}: {
  group: LabGroup;
  expanded: boolean;
  onToggle: () => void;
  reportsByObservationId: Map<string, ReportLink[]>;
  referenceMode: ReferenceOverlayMode;
  referenceContext?: ReferenceContext;
}) {
  const { t } = useInterfaceLanguage();
  const navigate = useNavigate();
  const latest = group.labs[0],
    latestReference = buildLabReferenceEvaluation({
      group,
      lab: latest,
      mode: referenceMode,
      referenceContext,
    }),
    statusSummary = summarizeLabGroupStatus(
      group,
      referenceMode,
      referenceContext,
    );

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
        className="cursor-pointer px-3 py-2.5 text-left hover:bg-blue-50"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
            className="shrink-0 rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            aria-label={`${expanded ? t('Collapse') : t('Expand')} ${
              group.name
            }`}
          >
            {expanded ? (
              <ChevronDownIcon className="h-5 w-5" />
            ) : (
              <ChevronRightIcon className="h-5 w-5" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="break-words text-sm font-semibold leading-5 text-gray-900">
                  {group.name}
                </h2>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-600">
                  {group.code ? <span>LOINC {group.code}</span> : null}
                  <span>
                    {group.labs.length} {t('results')}
                  </span>
                </div>
              </div>
              <div
                className={`shrink-0 text-right text-sm font-semibold ${getFlagTextClass(
                  latestReference.flag,
                )}`}
              >
                {formatLabValue(latest) || t('No value')}
              </div>
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
              <span className="text-gray-600">
                {safeFormatDate(latest.metadata?.date, 'PP', t('Unknown'))}
              </span>
              {statusSummary.abnormalCount > 0 ? (
                <span
                  className={`font-semibold ${
                    statusSummary.highCount > 0 || statusSummary.lowCount > 0
                      ? 'text-red-700'
                      : 'text-amber-700'
                  }`}
                >
                  {statusSummary.label}
                </span>
              ) : (
                <span className="font-medium text-gray-600">
                  {t('In range')}
                </span>
              )}
            </div>
          </div>
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

function LabTableRow({
  group,
  expanded,
  onToggle,
  reportsByObservationId,
  referenceMode,
  referenceContext,
}: {
  group: LabGroup;
  expanded: boolean;
  onToggle: () => void;
  reportsByObservationId: Map<string, ReportLink[]>;
  referenceMode: ReferenceOverlayMode;
  referenceContext?: ReferenceContext;
}) {
  const { t } = useInterfaceLanguage();
  const navigate = useNavigate();
  const latest = group.labs[0],
    latestReports = reportsByObservationId.get(latest.metadata?.id || '') || [],
    latestReference = buildLabReferenceEvaluation({
      group,
      lab: latest,
      mode: referenceMode,
      referenceContext,
    }),
    statusSummary = summarizeLabGroupStatus(
      group,
      referenceMode,
      referenceContext,
    );

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
            aria-label={`${expanded ? t('Collapse') : t('Expand')} ${
              group.name
            }`}
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
              <span>
                {group.labs.length} {t('results')}
              </span>
            </div>
          </div>
        </div>
        <div
          className={`text-sm font-semibold ${getFlagTextClass(
            latestReference.flag,
          )}`}
        >
          {formatLabValue(latest) || t('No value')}
          {latestReference.normalizedValue?.note ? (
            <div className="mt-1 text-[11px] font-medium leading-4 text-gray-500">
              {latestReference.normalizedValue.note}
            </div>
          ) : null}
        </div>
        <LabReferenceRange
          range={latestReference.referenceRange}
          sourceRange={latestReference.sourceReferenceRange}
          label={
            latestReference.mode === 'original'
              ? t('Source range')
              : t('Reference standard')
          }
          ageBand={latestReference.referenceAgeBand}
          citation={latestReference.referenceCitation}
          note={latestReference.referenceNote}
          isMappedStandard={latestReference.isMappedStandard}
        />
        <div className="text-sm text-gray-700">
          {safeFormatDate(latest.metadata?.date, 'PP', t('Unknown'))}
        </div>
        <div className="text-sm">
          <LinkedReportList reports={latestReports} />
        </div>
        <div className="text-sm">
          {statusSummary.abnormalCount > 0 ? (
            <span
              className={`font-semibold ${
                statusSummary.highCount > 0 || statusSummary.lowCount > 0
                  ? 'text-red-700'
                  : 'text-amber-700'
              }`}
            >
              {statusSummary.label}
            </span>
          ) : (
            <span className="text-gray-600">{t('In range')}</span>
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

function getFlagTextClass(flag: LabFlag): string {
  if (flag === 'high' || flag === 'low') return 'text-red-700';
  if (flag === 'borderline' || flag === 'abnormal') return 'text-amber-700';
  return 'text-gray-900';
}
