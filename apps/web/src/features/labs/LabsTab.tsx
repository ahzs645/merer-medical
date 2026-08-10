import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DocumentPlusIcon } from '@heroicons/react/24/outline';

import { AppPage } from '../../shared/components/AppPage';
import { EmptyRecordsPlaceholder } from '../../shared/components/EmptyRecordsPlaceholder';
import {
  RecordHeaderLink,
  RecordPageHeader,
} from '../../shared/components/records/RecordPageHeader';
import { LabsEmptySearch } from './components/LabsEmptySearch';
import { LabsSkeleton } from './components/LabsSkeleton';
import { LabsTable } from './components/LabsTable';
import { LibreCgmPanel } from './components/LibreCgmPanel';
import { RecordCoveragePanel } from './components/RecordCoveragePanel';
import { ReferenceOverlayMode } from './enrichment/types';
import {
  buildLabReferenceEvaluation,
  isPlannerRelevantLab,
} from './enrichment/labEnrichment';
import { useLabsData } from './hooks/useLabsData';
import {
  filterLabGroups,
  groupLabs,
  sectionLabGroups,
} from './utils/labGrouping';
import { labFilterLabels } from './utils/labFormatters';
import {
  getSavedLabsQuery,
  initialLabsView,
  LABS_ADDED_PARAM,
  LABS_SCROLL_CONTAINER_ID,
  labsPathAfterAdd,
  restoreLabsScrollPosition,
  saveLabsQuery,
} from './utils/labsPageState';
import { buildAddRecordPath } from '../manual-entry/addRecordPath';
import { GLUCOSE_LOINC_CODE } from '../diabetes/libreView';
import { LabFilterMode } from './types';

const ADD_LAB_PATH = buildAddRecordPath({
  type: 'lab',
  returnTo: labsPathAfterAdd(),
});

export function LabsTab() {
  const [searchParams, setSearchParams] = useSearchParams(),
    [initialView] = useState(() =>
      initialLabsView(searchParams, getSavedLabsQuery()),
    ),
    [query, setQuery] = useState(initialView.query),
    [referenceMode, setReferenceMode] =
      useState<ReferenceOverlayMode>('canadian'),
    [filterMode, setFilterMode] = useState<LabFilterMode>(
      initialView.filterMode,
    ),
    scrollContainerRef = useRef<HTMLDivElement | null>(null),
    {
      labs,
      reportsByObservationId,
      connectionsById,
      referenceContext,
      recordCoverage,
      status,
    } = useLabsData();

  const groupedLabs = useMemo(() => groupLabs(labs), [labs]);
  const filteredGroups = useMemo(
    () =>
      filterLabGroups(
        groupedLabs,
        query,
        filterMode,
        referenceMode,
        referenceContext,
      ),
    [filterMode, groupedLabs, query, referenceContext, referenceMode],
  );
  const attentionGroupCount = useMemo(
    () =>
      groupedLabs.filter((group) =>
        group.labs.some((lab) =>
          ['high', 'low', 'abnormal', 'borderline'].includes(
            buildLabReferenceEvaluation({
              group,
              lab,
              mode: referenceMode,
              referenceContext,
            }).flag,
          ),
        ),
      ).length,
    [groupedLabs, referenceContext, referenceMode],
  );
  const plannerGroupCount = useMemo(
    () => groupedLabs.filter((group) => isPlannerRelevantLab(group)).length,
    [groupedLabs],
  );
  const labSections = useMemo(
    () => sectionLabGroups(filteredGroups),
    [filteredGroups],
  );
  const filterCounts: Record<LabFilterMode, number> = {
    attention: attentionGroupCount,
    planner: plannerGroupCount,
    all: groupedLabs.length,
  };
  const libreLabs = useMemo(
    () =>
      labs.filter(
        (lab) =>
          lab.metadata?.loinc_coding?.includes(GLUCOSE_LOINC_CODE) &&
          connectionsById.get(lab.connection_record_id)?.source ===
            'freestyle_libre',
      ),
    [connectionsById, labs],
  );

  useEffect(() => {
    saveLabsQuery(query);
  }, [query]);

  // The marker is consumed once, on arrival. Leaving it in the URL would put
  // the page back on "All" on every reload of this entry, overriding a filter
  // the reader has since chosen for themselves.
  useEffect(() => {
    if (!searchParams.has(LABS_ADDED_PARAM)) return;
    const next = new URLSearchParams(searchParams);
    next.delete(LABS_ADDED_PARAM);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (status === 'success' && scrollContainerRef.current) {
      restoreLabsScrollPosition(scrollContainerRef.current);
    }
  }, [status, labSections.length]);

  return (
    <AppPage
      banner={
        <RecordPageHeader<LabFilterMode>
          title="All lab results"
          search={{
            query,
            onChange: setQuery,
            placeholder: 'Search lab name or code',
            label: 'Search labs',
          }}
          action={
            <RecordHeaderLink
              to={ADD_LAB_PATH}
              label="Add lab result"
              icon={DocumentPlusIcon}
              compact
            />
          }
          // Labs used to keep its filter in a bespoke segmented control inside
          // the first card, the only record page that did. It is the same
          // control every other tab wears in the banner, so it wears it here.
          filters={{
            items: (Object.keys(labFilterLabels) as LabFilterMode[]).map(
              (mode) => ({
                id: mode,
                label: labFilterLabels[mode],
                count: filterCounts[mode],
              }),
            ),
            selectedId: filterMode,
            onSelect: setFilterMode,
            label: 'Filter labs',
          }}
        />
      }
    >
      {status === 'success' && labs.length === 0 ? (
        <EmptyRecordsPlaceholder />
      ) : (
        <div
          id={LABS_SCROLL_CONTAINER_ID}
          ref={scrollContainerRef}
          className="h-full overflow-y-auto bg-gray-50"
        >
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 py-3 pb-24 sm:gap-4 sm:px-6 sm:py-4 lg:px-8">
            {status === 'loading' ? (
              <LabsSkeleton />
            ) : groupedLabs.length > 0 ? (
              <>
                <LibreCgmPanel labs={libreLabs} />
                <RecordCoveragePanel
                  coverage={recordCoverage}
                  visibleCount={filteredGroups.length}
                  totalGroups={groupedLabs.length}
                  filterMode={filterMode}
                  referenceMode={referenceMode}
                  setReferenceMode={setReferenceMode}
                  referenceContext={referenceContext}
                />
                {filteredGroups.length > 0 ? (
                  labSections.map((section) => (
                    <LabsTable
                      key={section.key}
                      groups={section.groups}
                      reportsByObservationId={reportsByObservationId}
                      title={section.title}
                      description={section.description}
                      referenceMode={referenceMode}
                      referenceContext={referenceContext}
                    />
                  ))
                ) : (
                  <LabsEmptySearch
                    query={query || labFilterLabels[filterMode]}
                  />
                )}
              </>
            ) : (
              <LabsEmptySearch query={query} />
            )}
          </div>
        </div>
      )}
    </AppPage>
  );
}
