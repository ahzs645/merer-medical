import { useMemo, useState } from 'react';
import {
  BeakerIcon,
  DocumentTextIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

import { AppPage } from '../../shared/components/AppPage';
import { RecordPageHeader } from '../../shared/components/records/RecordPageHeader';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { LabHistoryChart } from '../labs/components/LabHistoryChart';
import { LabHistoryTable } from '../labs/components/LabHistoryTable';
import { LabReferenceOverlayControls } from '../labs/components/LabReferenceOverlayControls';
import { LabReferenceStandardControl } from '../labs/components/LabReferenceStandardControl';
import { ReferenceRangeDisplay } from '../../shared/components/ReferenceRangeDisplay';
import { referenceOverlayLabels } from '../labs/enrichment/labEnrichment';
import { ReferenceOverlayMode } from '../labs/enrichment/types';
import { formatResultValue } from './utils/resultNormalization';
import { useResultsData } from './hooks/useResultsData';
import { ResultDetail, ResultGroup, ResultSummary, ResultType } from './types';

const defaultOverlayModes: ReferenceOverlayMode[] = ['canadian'];

export function ResultsTab() {
  const { t } = useInterfaceLanguage();

  return (
    <AppPage
      banner={
        <RecordPageHeader
          title={t('Results')}
          description={t(
            'Labs, imaging, reports, and linked result documents.',
          )}
        />
      }
    >
      <ResultsHubContent />
    </AppPage>
  );
}

export function ResultsHubContent({ className = '' }: { className?: string }) {
  const { t } = useInterfaceLanguage();
  const [referenceMode, setReferenceMode] =
    useState<ReferenceOverlayMode>('canadian');
  const [enabledOverlayModes, setEnabledOverlayModes] =
    useState<ReferenceOverlayMode[]>(defaultOverlayModes);
  // Phones only: the picker is collapsed so records start near the top.
  const [showReferencePicker, setShowReferencePicker] = useState(false);
  const { groups, detailsById, status } = useResultsData(referenceMode);
  const [selectedId, setSelectedId] = useState<string>();
  const selectedDetail = useMemo(() => {
    if (selectedId && detailsById.has(selectedId)) {
      return detailsById.get(selectedId);
    }
    return groups[0]?.results[0]
      ? detailsById.get(groups[0].results[0].detailId)
      : undefined;
  }, [detailsById, groups, selectedId]);

  const totals = useMemo(() => {
    const results = groups.flatMap((group) => group.results);
    return {
      total: results.length,
      labs: results.filter((result) => result.type === 'lab').length,
      // The tile says "Imaging & reports", so it has to count the report and
      // document records too, not imaging studies alone.
      imagingAndReports: results.filter((result) =>
        ['imaging', 'diagnostic-report', 'document'].includes(result.type),
      ).length,
      attention: results.filter((result) => result.abnormal).length,
    };
  }, [groups]);

  return (
    <section
      className={`col-span-6 flex min-h-[42rem] flex-col gap-3 rounded-md bg-gray-50 p-3 shadow-sm ring-1 ring-gray-200 sm:gap-4 sm:p-4 ${className}`}
    >
      {/* No page title or blurb here: the banner above carries both. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4">
        {/* Two compact columns on phones - four full-width tiles plus the
            reference picker used to fill two screens before the first record. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <MetricCard label="Total results" value={totals.total} />
          <MetricCard label="Labs" value={totals.labs} />
          <MetricCard
            label="Imaging & reports"
            value={totals.imagingAndReports}
          />
          <MetricCard label="Needs attention" value={totals.attention} />
        </div>

        <button
          type="button"
          onClick={() => setShowReferencePicker((shown) => !shown)}
          aria-expanded={showReferencePicker}
          className="flex min-h-[44px] items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-800 shadow-sm sm:hidden"
        >
          <span>Reference standard</span>
          <span className="font-normal text-gray-600">
            {referenceOverlayLabels[referenceMode]}
          </span>
        </button>
        <div className={`${showReferencePicker ? '' : 'hidden'} sm:block`}>
          <LabReferenceStandardControl
            selectedMode={referenceMode}
            setSelectedMode={setReferenceMode}
          />
        </div>

        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(20rem,0.9fr)_minmax(0,1.4fr)]">
          <section className="min-h-0 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-sm">
            {status === 'loading' ? (
              <div className="p-4 text-sm text-gray-600">
                {t('Loading results...')}
              </div>
            ) : groups.length === 0 ? (
              <div className="p-4 text-sm text-gray-600">
                {t('No results found.')}
              </div>
            ) : (
              groups.map((group) => (
                <ResultGroupSection
                  key={group.id}
                  group={group}
                  selectedId={selectedDetail?.detailId}
                  onSelect={setSelectedId}
                />
              ))
            )}
          </section>

          <section className="min-h-0 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-sm">
            {selectedDetail ? (
              <ResultDetailPanel
                detail={selectedDetail}
                enabledOverlayModes={enabledOverlayModes}
                setEnabledOverlayModes={setEnabledOverlayModes}
              />
            ) : (
              <div className="p-6 text-sm text-gray-600">
                {t('Select a result to view details.')}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm sm:px-4 sm:py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 sm:text-xs">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold text-gray-900 sm:mt-1 sm:text-2xl">
        {value}
      </p>
    </div>
  );
}

function ResultGroupSection({
  group,
  selectedId,
  onSelect,
}: {
  group: ResultGroup;
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  // Most groups hold exactly one result, and the group's title is that result's
  // title — so the list printed every name twice in a row, header then row. A
  // one-result group keeps the date as its header and lets the row say the name
  // once; a group that genuinely collects several still gets its heading.
  const namesOneResult =
    group.results.length === 1 && group.results[0]?.title === group.title;

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div className="bg-gray-50 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {safeFormatDate(group.date, 'PP', 'Unknown date')}
        </p>
        {namesOneResult ? null : (
          <h2 className="truncate text-sm font-semibold text-gray-900">
            {group.title}
          </h2>
        )}
      </div>
      <div className="divide-y divide-gray-100">
        {group.results.map((result) => (
          <ResultRow
            key={result.detailId}
            result={result}
            selected={selectedId === result.detailId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function ResultRow({
  result,
  selected,
  onSelect,
}: {
  result: ResultSummary;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const Icon = resultTypeIcon(result.type);

  return (
    <button
      type="button"
      onClick={() => onSelect(result.detailId)}
      className={`grid w-full grid-cols-[auto_minmax(0,1fr)] gap-3 px-3 py-3 text-left hover:bg-blue-50 ${
        selected ? 'bg-blue-50' : ''
      }`}
    >
      <Icon className="mt-0.5 h-5 w-5 text-primary-700" />
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold text-gray-900">
            {result.title}
          </p>
          <StatusBadge abnormal={result.abnormal} status={result.status} />
        </div>
        <p className="mt-1 text-xs text-gray-600">
          {result.source || resultTypeLabel(result.type)}
        </p>
        {result.metadataOnly ? (
          <p className="mt-1 text-xs font-medium text-amber-700">
            Report metadata only
          </p>
        ) : null}
      </div>
    </button>
  );
}

function ResultDetailPanel({
  detail,
  enabledOverlayModes,
  setEnabledOverlayModes,
}: {
  detail: ResultDetail;
  enabledOverlayModes: ReferenceOverlayMode[];
  setEnabledOverlayModes: (modes: ReferenceOverlayMode[]) => void;
}) {
  const enabledOverlays = (detail.labOverlays || []).filter((overlay) =>
    enabledOverlayModes.includes(overlay.mode),
  );

  return (
    <div className="space-y-4 p-4">
      <header className="border-b border-gray-200 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {resultTypeLabel(detail.type)}
            </p>
            {/* h2: the banner already owns the page's only h1. */}
            <h2 className="mt-1 text-xl font-semibold text-gray-900">
              {detail.title}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {safeFormatDate(
                detail.resultDate || detail.date,
                'PP',
                'Unknown date',
              )}
              {detail.organization ? ` · ${detail.organization}` : ''}
            </p>
          </div>
        </div>
      </header>

      <MetadataGrid detail={detail} />

      {detail.type === 'lab' && detail.group && detail.lab ? (
        <div className="space-y-4">
          <section className="rounded-md border border-gray-200 p-3">
            <div className="grid gap-3 md:grid-cols-3">
              <InfoBlock
                label="Latest value"
                value={formatResultValue(detail.lab)}
              />
              <InfoBlock
                label="Selected range"
                value={detail.labEvaluation?.referenceRange || 'Not mapped'}
              />
              <InfoBlock
                label="Source range"
                value={
                  detail.labEvaluation?.sourceReferenceRange || 'Not provided'
                }
              />
            </div>
            {detail.labEvaluation ? (
              <div className="mt-3">
                <ReferenceRangeDisplay
                  range={detail.labEvaluation.referenceRange}
                  ageBand={detail.labEvaluation.referenceAgeBand}
                  citation={detail.labEvaluation.referenceCitation}
                />
                {detail.labEvaluation.referenceNote ? (
                  <p className="mt-1 text-xs text-gray-600">
                    {detail.labEvaluation.referenceNote}
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>

          <LabReferenceOverlayControls
            overlays={detail.labOverlays || []}
            enabledModes={enabledOverlayModes}
            setEnabledModes={setEnabledOverlayModes}
          />
          <LabHistoryChart
            group={detail.group}
            referenceOverlays={enabledOverlays}
          />
          <LabHistoryTable
            group={detail.group}
            reportsByObservationId={
              new Map([[detail.lab.metadata?.id || '', detail.reports || []]])
            }
          />
        </div>
      ) : (
        <ReportDetailBody detail={detail} />
      )}
    </div>
  );
}

function MetadataGrid({ detail }: { detail: ResultDetail }) {
  return (
    <section className="grid gap-3 rounded-md border border-gray-200 bg-gray-50 p-3 sm:grid-cols-2 xl:grid-cols-3">
      <InfoBlock label="Status" value={detail.status} />
      <InfoBlock
        label="Collected"
        value={formatMaybeDate(detail.collectionDate)}
      />
      <InfoBlock label="Updated" value={formatMaybeDate(detail.updatedDate)} />
      <InfoBlock
        label="Performer"
        value={detail.performer || detail.provider}
      />
      <InfoBlock label="Accession" value={detail.accessionId} />
      <InfoBlock label="Report ID" value={detail.reportId || detail.studyId} />
    </section>
  );
}

function ReportDetailBody({ detail }: { detail: ResultDetail }) {
  return (
    <div className="space-y-4">
      {detail.metadataOnly ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Report metadata only. No lab components, narrative, impression, scans,
          or attachments were available in the connected record.
        </div>
      ) : null}
      <TextSection title="Impression" value={detail.impression} />
      <TextSection title="Narrative" value={detail.narrative} />
      <TextSection title="Result note" value={detail.resultNote} />
      {detail.providerComments.length > 0 ? (
        <section>
          <h2 className="text-sm font-semibold text-gray-900">
            Provider comments
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
            {detail.providerComments.map((comment, index) => (
              <li key={`${comment}-${index}`}>{comment}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <section>
        <h2 className="text-sm font-semibold text-gray-900">
          Linked documents and reports
        </h2>
        {detail.linkedDocuments.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">None linked.</p>
        ) : (
          <div className="mt-2 divide-y divide-gray-100 rounded-md border border-gray-200">
            {detail.linkedDocuments.map((document) => (
              <div key={document.id} className="px-3 py-2">
                <p className="text-sm font-medium text-gray-900">
                  {document.title}
                </p>
                <p className="text-xs text-gray-500">
                  {document.type}
                  {document.date
                    ? ` · ${safeFormatDate(document.date, 'PP', '')}`
                    : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TextSection({ title, value }: { title: string; value?: string }) {
  if (!value) return null;
  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
        {value}
      </p>
    </section>
  );
}

function InfoBlock({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-gray-900">
        {value || 'Not available'}
      </p>
    </div>
  );
}

/**
 * Green meant "not abnormal", which is not the same as "fine" — a result the
 * source never gave a status for came through as a green pill reading
 * "unknown", the same green as "final". An unknown status is grey; a known,
 * unremarkable one keeps the green.
 */
function StatusBadge({
  status,
  abnormal,
}: {
  status: string;
  abnormal: boolean;
}) {
  const unknown = !status || /^(unknown|entered-in-error|null)$/i.test(status);
  const tone = abnormal
    ? 'bg-amber-100 text-amber-800'
    : unknown
      ? 'bg-gray-100 text-gray-600'
      : 'bg-emerald-100 text-emerald-800';

  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}
    >
      {abnormal ? 'Attention' : unknown ? 'No status' : status}
    </span>
  );
}

function resultTypeIcon(type: ResultType) {
  if (type === 'lab') return BeakerIcon;
  if (type === 'imaging') return PhotoIcon;
  return DocumentTextIcon;
}

function resultTypeLabel(type: ResultType) {
  if (type === 'lab') return 'Lab result';
  if (type === 'imaging') return 'Imaging / radiology';
  if (type === 'diagnostic-report') return 'Diagnostic report';
  if (type === 'document') return 'Document';
  if (type === 'procedure') return 'Procedure';
  return 'Result';
}

function formatMaybeDate(value?: string) {
  return value ? safeFormatDate(value, 'PP', value) : undefined;
}
