import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

import { AppPage } from '../../shared/components/AppPage';
import { RecordPageHeader } from '../../shared/components/records/RecordPageHeader';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { Routes } from '../../Routes';
import { LabHistoryChart } from './components/LabHistoryChart';
import { LabHistoryTable } from './components/LabHistoryTable';
import { LabReferenceOverlayControls } from './components/LabReferenceOverlayControls';
import { LabsSkeleton } from './components/LabsSkeleton';
import { buildLabReferenceOverlays } from './enrichment/labEnrichment';
import {
  getLabGraphUnitOptions,
  normalizeReferenceOverlaysForGraph,
} from './enrichment/labGraphNormalization';
import { ReferenceOverlayMode } from './enrichment/types';
import { useLabsData } from './hooks/useLabsData';
import { useConditionsData } from '../conditions/hooks/useConditionsData';
import { RelatedConditionsCard } from './components/RelatedConditionsCard';
import { groupLabs } from './utils/labGrouping';
import {
  getLabGroupInsight,
  getLabResultStatusClass,
} from './utils/labResultDetails';
import { StylizedSelect } from '../../shared/components/StylizedSelect';

export function LabDetailTab() {
  const { labKey } = useParams<{ labKey: string }>(),
    { labs, reportsByObservationId, referenceContext, status } = useLabsData();
  const { bundles: conditionBundles } = useConditionsData();
  const [enabledOverlayModes, setEnabledOverlayModes] = useState<
    ReferenceOverlayMode[]
  >(['canadian', 'original']);
  const [selectedGraphUnit, setSelectedGraphUnit] = useState<string>();

  const groupedLabs = useMemo(() => groupLabs(labs), [labs]);
  const group = useMemo(() => {
    // No `decodeURIComponent` here: React Router has already decoded the
    // param, so decoding it again is a no-op for most lab names and a crash
    // for any containing a percent sign — the link is written `psa%20%25`,
    // the param arrives as "psa %", and "% " is not a valid escape, so the
    // whole page came down with "URI malformed". "PSA %" and "HDL % of total"
    // are both in an ordinary blood panel.
    return groupedLabs.find((item) => item.key === (labKey ?? ''));
  }, [groupedLabs, labKey]);
  const latestLab = group?.labs[0];
  const relatedConditions = useMemo(() => {
    if (!group) return [];
    const labIds = new Set(group.labs.map((lab) => lab.id));
    return conditionBundles
      .filter((bundle) =>
        bundle.related.some(
          (record) => record.kind === 'lab' && labIds.has(record.document.id),
        ),
      )
      .map((bundle) => ({
        id: bundle.id,
        name: bundle.name,
        status: bundle.status,
      }));
  }, [group, conditionBundles]);
  const labInsight = useMemo(
    () =>
      group ? getLabGroupInsight(group, reportsByObservationId) : undefined,
    [group, reportsByObservationId],
  );
  const referenceOverlays = useMemo(() => {
    if (!group || !latestLab) return [];
    return buildLabReferenceOverlays({
      group,
      lab: latestLab,
      referenceContext,
    });
  }, [group, latestLab, referenceContext]);
  const graphUnitOptions = useMemo(
    () => (group ? getLabGraphUnitOptions(group, referenceOverlays) : []),
    [group, referenceOverlays],
  );
  const activeGraphUnit = graphUnitOptions.some(
    (option) => option.unit === selectedGraphUnit,
  )
    ? selectedGraphUnit
    : graphUnitOptions[0]?.unit;
  const enabledReferenceOverlays = useMemo(() => {
    const overlays = referenceOverlays.filter((overlay) =>
      enabledOverlayModes.includes(overlay.mode),
    );
    return normalizeReferenceOverlaysForGraph({
      group,
      overlays,
      targetUnit: activeGraphUnit,
    });
  }, [activeGraphUnit, enabledOverlayModes, group, referenceOverlays]);

  return (
    <AppPage
      banner={
        // The banner carries the page title (and the only <h1>). The card below
        // used to repeat the name as an <h2> with the same metadata line, and
        // the status again in a stat card, so "LYMPHS" and "No flag" each
        // appeared twice before anything new was said. The metadata belongs to
        // the title, so it lives here now.
        <RecordPageHeader
          title={group?.name ?? 'Lab result'}
          backLink={{ to: Routes.Labs, label: 'All lab results' }}
          count={
            group ? (
              <span className="flex flex-wrap gap-x-3 gap-y-0.5">
                {group.code ? <span>LOINC {group.code}</span> : null}
                <span>
                  {group.labs.length} result{group.labs.length === 1 ? '' : 's'}
                </span>
                <span>
                  Latest{' '}
                  {safeFormatDate(
                    group.labs[0]?.metadata?.date,
                    'PP',
                    'Unknown',
                  )}
                </span>
              </span>
            ) : undefined
          }
        />
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          {status === 'loading' ? (
            <LabsSkeleton />
          ) : group ? (
            <>
              {/* One summary line, not four full-width cards.
                  The cards read "Comments 0" and "Reported by 0 / Unknown
                  source" — a count standing in for a name, and a whole card
                  saying nothing is there — and on a phone they pushed the graph
                  (the reason you opened this page) about 900px down. The value
                  keeps its size because it is the answer; everything else is a
                  fact beside it, and facts with nothing in them do not print. */}
              {labInsight ? (
                <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-5">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span
                      className={`text-3xl font-bold ${getLabResultStatusClass(
                        labInsight.latest.status,
                      )}`}
                    >
                      {labInsight.latest.value}
                    </span>
                    {labInsight.latest.statusLabel ? (
                      <span
                        className={`text-sm font-semibold ${getLabResultStatusClass(
                          labInsight.latest.status,
                        )}`}
                      >
                        {labInsight.latest.statusLabel}
                      </span>
                    ) : null}
                    <span className="text-sm text-gray-600">latest result</span>
                  </div>
                  <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 border-t border-gray-100 pt-3 text-sm">
                    {labInsight.abnormalCount > 0 ? (
                      <LabSummaryFact
                        label="Flagged"
                        value={`${labInsight.abnormalCount} of ${group.labs.length}`}
                        detail={`${labInsight.highCount} high, ${labInsight.lowCount} low`}
                        valueClassName="text-red-700"
                      />
                    ) : (
                      <LabSummaryFact
                        label="Flagged"
                        value="None"
                        valueClassName="text-green-700"
                      />
                    )}
                    <LabSummaryFact
                      label="Reported by"
                      value={
                        labInsight.distinctPerformers.slice(0, 2).join(', ') ||
                        labInsight.latest.source ||
                        'Unknown source'
                      }
                    />
                    {labInsight.commentedCount > 0 ? (
                      <LabSummaryFact
                        label="With comments"
                        value={`${labInsight.commentedCount} of ${group.labs.length}`}
                      />
                    ) : null}
                  </dl>
                </section>
              ) : null}
              <RelatedConditionsCard conditions={relatedConditions} />
              {labInsight &&
              (labInsight.latest.comments.length > 0 ||
                labInsight.latest.performer ||
                labInsight.latest.accessionId) ? (
                <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-5">
                  <h2 className="text-base font-semibold text-gray-900">
                    Latest result details
                  </h2>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <LabDetailField
                      label="Reference"
                      value={labInsight.latest.referenceRange}
                    />
                    <LabDetailField
                      label="Performer"
                      value={labInsight.latest.performer}
                    />
                    <LabDetailField
                      label="Accession"
                      value={labInsight.latest.accessionId}
                    />
                  </dl>
                  {labInsight.latest.comments.length > 0 ? (
                    <div className="mt-4 rounded-md bg-blue-50 p-3 text-sm text-blue-950 ring-1 ring-blue-100">
                      <h3 className="font-semibold">Provider comments</h3>
                      <ul className="mt-2 space-y-1">
                        {labInsight.latest.comments.map((comment) => (
                          <li key={comment}>{comment}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>
              ) : null}
              <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-5">
                <div className="flex flex-col gap-3">
                  <h2 className="text-base font-semibold text-gray-900">
                    Graph
                  </h2>
                  {graphUnitOptions.length > 1 ? (
                    <label className="flex w-full max-w-xs flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Normalize to
                      <StylizedSelect
                        value={activeGraphUnit || ''}
                        onChange={setSelectedGraphUnit}
                        className="normal-case tracking-normal"
                        buttonClassName="font-medium"
                        options={graphUnitOptions.map((option) => ({
                          value: option.unit,
                          label: option.label,
                        }))}
                      />
                    </label>
                  ) : null}
                  <LabReferenceOverlayControls
                    overlays={referenceOverlays}
                    enabledModes={enabledOverlayModes}
                    setEnabledModes={setEnabledOverlayModes}
                  />
                </div>
                <div className="mt-3">
                  <LabHistoryChart
                    group={group}
                    heightClassName="h-64 sm:h-96"
                    referenceOverlays={enabledReferenceOverlays}
                    showReferenceRange={false}
                    targetUnit={activeGraphUnit}
                  />
                </div>
              </section>
              <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-5">
                <div className="mb-3">
                  <h2 className="text-base font-semibold text-gray-900">
                    Result history
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    All recorded values for this lab, newest first.
                  </p>
                </div>
                <LabHistoryTable
                  group={group}
                  reportsByObservationId={reportsByObservationId}
                />
              </section>
            </>
          ) : (
            <section className="rounded-md bg-white p-10 text-center shadow-sm ring-1 ring-gray-200">
              {/* h2: the banner already owns the page's only h1. */}
              <h2 className="text-lg font-semibold text-gray-900">
                Lab not found
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                This lab may have been renamed or removed.
              </p>
              <Link
                to={Routes.Labs}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-900"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Back to all labs
              </Link>
            </section>
          )}
        </div>
      </div>
    </AppPage>
  );
}

function LabSummaryFact({
  label,
  value,
  detail,
  valueClassName = 'text-gray-900',
}: {
  label: string;
  value: string;
  detail?: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className={`font-semibold ${valueClassName}`}>
        {value}
        {detail ? (
          <span className="ms-1.5 font-normal text-gray-600">({detail})</span>
        ) : null}
      </dd>
    </div>
  );
}

function LabDetailField({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </dt>
      <dd className="mt-1 text-gray-900">{value || 'Not recorded'}</dd>
    </div>
  );
}
