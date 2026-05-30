import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { ArrowLeftIcon } from '@heroicons/react/24/outline';

import { AppPage } from '../../shared/components/AppPage';
import { safeFormatDate } from '../../shared/utils/dateFormatters';
import { Routes } from '../../Routes';
import { LabHistoryChart } from './components/LabHistoryChart';
import { LabHistoryTable } from './components/LabHistoryTable';
import { LabReferenceOverlayControls } from './components/LabReferenceOverlayControls';
import { LabsHeader } from './components/LabsHeader';
import { LabsSkeleton } from './components/LabsSkeleton';
import { buildLabReferenceOverlays } from './enrichment/labEnrichment';
import {
  getLabGraphUnitOptions,
  normalizeReferenceOverlaysForGraph,
} from './enrichment/labGraphNormalization';
import { ReferenceOverlayMode } from './enrichment/types';
import { useLabsData } from './hooks/useLabsData';
import { groupLabs } from './utils/labGrouping';
import { ProvenancePanel } from '../provenance/ProvenancePanel';
import { LinkedReportList } from './components/LinkedReportList';
import {
  getLabGroupInsight,
  getLabResultStatusClass,
} from './utils/labResultDetails';
import { StylizedSelect } from '../../shared/components/StylizedSelect';

export function LabDetailTab() {
  const { labKey } = useParams<{ labKey: string }>(),
    { labs, reportsByObservationId, connectionsById, status } = useLabsData();
  const [enabledOverlayModes, setEnabledOverlayModes] = useState<
    ReferenceOverlayMode[]
  >(['canadian', 'original']);
  const [selectedGraphUnit, setSelectedGraphUnit] = useState<string>();

  const groupedLabs = useMemo(() => groupLabs(labs), [labs]);
  const group = useMemo(() => {
    const decodedKey = labKey ? decodeURIComponent(labKey) : '';
    return groupedLabs.find((item) => item.key === decodedKey);
  }, [groupedLabs, labKey]);
  const latestLab = group?.labs[0];
  const latestReports = latestLab
    ? reportsByObservationId.get(latestLab.metadata?.id || '') || []
    : [];
  const latestConnection = latestLab
    ? connectionsById.get(latestLab.connection_record_id)
    : undefined;
  const labInsight = useMemo(
    () => (group ? getLabGroupInsight(group) : undefined),
    [group],
  );
  const referenceOverlays = useMemo(() => {
    if (!group || !latestLab) return [];
    return buildLabReferenceOverlays({ group, lab: latestLab });
  }, [group, latestLab]);
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
        <LabsHeader
          query=""
          setQuery={() => undefined}
          hideSearch
          hideOnMobile
        />
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          {status === 'loading' ? (
            <LabsSkeleton />
          ) : group ? (
            <>
              <div>
                <Link
                  to={Routes.Labs}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-900"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Back to all labs
                </Link>
              </div>
              <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">
                      {group.name}
                    </h1>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-600">
                      {group.code ? <span>LOINC {group.code}</span> : null}
                      <span>{group.labs.length} results</span>
                      <span>
                        Latest{' '}
                        {safeFormatDate(
                          group.labs[0]?.metadata?.date,
                          'PP',
                          'Unknown',
                        )}
                      </span>
                      {labInsight?.latest.statusLabel ? (
                        <span
                          className={`font-semibold ${getLabResultStatusClass(
                            labInsight.latest.status,
                          )}`}
                        >
                          {labInsight.latest.statusLabel}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>
              {latestLab ? (
                <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-5">
                  <div className="mb-3">
                    <h2 className="text-base font-semibold text-gray-900">
                      Source and related records
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Where this result came from, linked reports, and useful
                      next places to review.
                    </p>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
                    <ProvenancePanel
                      document={latestLab}
                      connection={latestConnection}
                    />
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Related links
                      </h3>
                      <div className="mt-3 space-y-3 text-sm">
                        <div>
                          <div className="font-medium text-gray-500">
                            Diagnostic reports
                          </div>
                          <div className="mt-1">
                            <LinkedReportList reports={latestReports} />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link
                            to={Routes.Documents}
                            className="rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-primary-50 hover:text-primary-700"
                          >
                            Documents
                          </Link>
                          <Link
                            to={Routes.AuditLog}
                            className="rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-primary-50 hover:text-primary-700"
                          >
                            Audit log
                          </Link>
                          <Link
                            to={Routes.Sharing}
                            className="rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 hover:bg-primary-50 hover:text-primary-700"
                          >
                            Export record
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}
              {labInsight ? (
                <section className="grid gap-3 md:grid-cols-4">
                  <LabInsightCard
                    label="Latest result"
                    value={labInsight.latest.value}
                    detail={labInsight.latest.statusLabel}
                    valueClassName={getLabResultStatusClass(
                      labInsight.latest.status,
                    )}
                  />
                  <LabInsightCard
                    label="Flagged results"
                    value={`${labInsight.abnormalCount}`}
                    detail={`${labInsight.highCount} high, ${labInsight.lowCount} low`}
                    valueClassName={
                      labInsight.abnormalCount > 0
                        ? 'text-red-700'
                        : 'text-green-700'
                    }
                  />
                  <LabInsightCard
                    label="Comments"
                    value={`${labInsight.commentedCount}`}
                    detail="provider or source notes"
                  />
                  <LabInsightCard
                    label="Reported by"
                    value={`${labInsight.distinctPerformers.length || 0}`}
                    detail={
                      labInsight.distinctPerformers.slice(0, 2).join(', ') ||
                      labInsight.latest.source ||
                      'Unknown source'
                    }
                  />
                </section>
              ) : null}
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
                    heightClassName="h-96"
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
              <h1 className="text-lg font-semibold text-gray-900">
                Lab not found
              </h1>
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

function LabInsightCard({
  label,
  value,
  detail,
  valueClassName = 'text-gray-900',
}: {
  label: string;
  value: string;
  detail: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className={`mt-2 text-xl font-bold ${valueClassName}`}>{value}</div>
      <div className="mt-1 max-h-8 overflow-hidden text-xs text-gray-600">
        {detail}
      </div>
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
