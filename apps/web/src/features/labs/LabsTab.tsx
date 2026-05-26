import { useEffect, useMemo, useRef, useState } from 'react';

import { AppPage } from '../../shared/components/AppPage';
import { EmptyRecordsPlaceholder } from '../../shared/components/EmptyRecordsPlaceholder';
import { LabsEmptySearch } from './components/LabsEmptySearch';
import { LabsHeader } from './components/LabsHeader';
import { LabReferenceStandardControl } from './components/LabReferenceStandardControl';
import { LabsSkeleton } from './components/LabsSkeleton';
import { LabsTable } from './components/LabsTable';
import { LibreCgmPanel } from './components/LibreCgmPanel';
import { ReferenceOverlayMode } from './enrichment/types';
import { useLabsData } from './hooks/useLabsData';
import {
  filterLabGroups,
  groupLabs,
  sectionLabGroups,
} from './utils/labGrouping';
import {
  getSavedLabsQuery,
  LABS_SCROLL_CONTAINER_ID,
  restoreLabsScrollPosition,
  saveLabsQuery,
} from './utils/labsPageState';
import { GLUCOSE_LOINC_CODE } from '../diabetes/libreView';

export function LabsTab() {
  const [query, setQuery] = useState(getSavedLabsQuery),
    [referenceMode, setReferenceMode] =
      useState<ReferenceOverlayMode>('canadian'),
    scrollContainerRef = useRef<HTMLDivElement | null>(null),
    { labs, reportsByObservationId, connectionsById, status } = useLabsData();

  const groupedLabs = useMemo(() => groupLabs(labs), [labs]);
  const filteredGroups = useMemo(
    () => filterLabGroups(groupedLabs, query),
    [groupedLabs, query],
  );
  const labSections = useMemo(
    () => sectionLabGroups(filteredGroups),
    [filteredGroups],
  );
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

  useEffect(() => {
    if (status === 'success' && scrollContainerRef.current) {
      restoreLabsScrollPosition(scrollContainerRef.current);
    }
  }, [status, labSections.length]);

  return (
    <AppPage
      banner={
        <LabsHeader
          labCount={labs.length}
          groupCount={groupedLabs.length}
          query={query}
          setQuery={setQuery}
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
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8">
            {status === 'loading' ? (
              <LabsSkeleton />
            ) : filteredGroups.length > 0 ? (
              <>
                <LibreCgmPanel labs={libreLabs} />
                <LabReferenceStandardControl
                  selectedMode={referenceMode}
                  setSelectedMode={setReferenceMode}
                />
                {labSections.map((section) => (
                  <LabsTable
                    key={section.key}
                    groups={section.groups}
                    reportsByObservationId={reportsByObservationId}
                    title={section.title}
                    description={section.description}
                    referenceMode={referenceMode}
                  />
                ))}
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
