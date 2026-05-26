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

export function LabDetailTab() {
  const { labKey } = useParams<{ labKey: string }>(),
    { labs, reportsByObservationId, status } = useLabsData();
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
          labCount={labs.length}
          groupCount={groupedLabs.length}
          query=""
          setQuery={() => undefined}
          hideSearch
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
                    </div>
                  </div>
                </div>
              </section>
              <section className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-5">
                <div className="flex flex-col gap-3">
                  <h2 className="text-base font-semibold text-gray-900">
                    Graph
                  </h2>
                  {graphUnitOptions.length > 1 ? (
                    <label className="flex w-full max-w-xs flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Normalize to
                      <select
                        value={activeGraphUnit || ''}
                        onChange={(event) =>
                          setSelectedGraphUnit(event.target.value)
                        }
                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                      >
                        {graphUnitOptions.map((option) => (
                          <option key={option.unit} value={option.unit}>
                            {option.label}
                          </option>
                        ))}
                      </select>
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
