import { useMemo, useState } from 'react';
import {
  ChartBarSquareIcon,
  DocumentPlusIcon,
} from '@heroicons/react/24/outline';

import { AppPage } from '../../shared/components/AppPage';
import { EmptyRecordsPlaceholder } from '../../shared/components/EmptyRecordsPlaceholder';
import {
  RecordHeaderButton,
  RecordHeaderLink,
  RecordPageHeader,
} from '../../shared/components/records/RecordPageHeader';
import { LabReferenceSelect } from './components/LabReferenceSelect';
import { LabsEmptySearch } from './components/LabsEmptySearch';
import { LabsSkeleton } from './components/LabsSkeleton';
import { LabsTable } from './components/LabsTable';
import { LibreCgmPanel } from './components/LibreCgmPanel';
import { RecordCoverageModal } from './components/RecordCoverageModal';
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
import { LABS_SCROLL_CONTAINER_ID } from './utils/labsPageState';
import { buildAddRecordPath } from '../manual-entry/addRecordPath';
import { GLUCOSE_LOINC_CODE } from '../diabetes/libreView';
import { LabFilterMode } from './types';
import { Routes as AppRoutes } from '../../Routes';
import { useListViewParams } from '../../shared/hooks/useListViewParams';

// Plain route: the page no longer needs telling that you are coming back from
// having typed a result. That marker existed because the list opened filtered
// to "Attention", where a normal new result was invisible — the reader was
// returned to a page that did not contain the row they had just created.
const ADD_LAB_PATH = buildAddRecordPath({
  type: 'lab',
  returnTo: AppRoutes.Labs,
});

export function LabsTab() {
  // Search and filter live in the URL, so this view survives Back, can be
  // linked, and comes back the same length it left — which is what lets the
  // shell restore your scroll position.
  const {
      query,
      setQuery,
      filterId: filterMode,
      setFilterId: setFilterMode,
    } = useListViewParams<LabFilterMode>({ defaultFilter: 'all' }),
    [referenceMode, setReferenceMode] =
      useState<ReferenceOverlayMode>('canadian'),
    [coverageOpen, setCoverageOpen] = useState(false),
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

  return (
    <AppPage
      banner={
        <RecordPageHeader<LabFilterMode>
          title="All lab results"
          // How much of the list you are being shown — it reflects the search
          // box as well as the chips, so neither replaces it.
          //
          // On a phone it is the one row here that repeats itself: the chips
          // directly below already read "Attention 5 · Key markers 2 · All 50",
          // and the page opens on Attention, so "5 of 50 lab tests listed"
          // above them mostly succeeded in reading as "you only have 5 labs".
          // It stays from `sm` up, where the banner has the room and the count
          // is the only thing tying the search box to the chips.
          count={
            groupedLabs.length > 0 ? (
              <span className="hidden sm:inline">
                <span className="font-semibold text-white">
                  {filteredGroups.length} of {groupedLabs.length}
                </span>{' '}
                lab tests listed
              </span>
            ) : undefined
          }
          search={{
            query,
            onChange: setQuery,
            placeholder: 'Search lab name or code',
            label: 'Search labs',
          }}
          // Three controls, so the group takes its own row below `md` — the
          // banner's documented behaviour once buttons cannot share the title's
          // line, and 52px of it buys back the 286px card underneath.
          action={
            <>
              <LabReferenceSelect
                mode={referenceMode}
                setMode={setReferenceMode}
              />
              <RecordHeaderButton
                onClick={() => setCoverageOpen(true)}
                label="What's in your records"
                icon={ChartBarSquareIcon}
                variant="subtle"
                compact
              />
              <RecordHeaderLink
                to={ADD_LAB_PATH}
                label="Add lab result"
                icon={DocumentPlusIcon}
                compact
              />
            </>
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
          className="h-full overflow-y-auto bg-gray-50"
        >
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 py-3 pb-24 sm:gap-4 sm:px-6 sm:py-4 lg:px-8">
            {status === 'loading' ? (
              <LabsSkeleton />
            ) : groupedLabs.length > 0 ? (
              <>
                <LibreCgmPanel labs={libreLabs} />
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
      {/* Outside the scroll container on purpose: the dialog portals itself to
          the body, and anchoring it here would tie its lifetime to a branch
          that unmounts when the last lab is filtered away. */}
      <RecordCoverageModal
        open={coverageOpen}
        setOpen={setCoverageOpen}
        coverage={recordCoverage}
        visibleCount={filteredGroups.length}
        totalGroups={groupedLabs.length}
        filterMode={filterMode}
        referenceContext={referenceContext}
      />
    </AppPage>
  );
}
