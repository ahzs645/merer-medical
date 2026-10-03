import { DentalNextCleaningPanel } from '../components/DentalNextCleaningPanel';
import { DentalSummaryPanel } from '../components/DentalSummaryPanel';
import { DentalWorkflowContextPanel } from '../components/DentalWorkflowContextPanel';
import { useDentalContext } from '../hooks/useDentalContext';

export function DentalOverviewTab() {
  const { counts, records, workflowContext, nextCleaning, imaging } =
    useDentalContext();
  const lastImagingDate = imaging
    .map((item) => item.date)
    .filter((date): date is string => !!date)
    .sort()
    .pop();

  return (
    <>
      {/* What most people open a dental record to find out leads it. */}
      <DentalNextCleaningPanel
        nextCleaning={nextCleaning}
        lastImagingDate={lastImagingDate}
      />
      <DentalWorkflowContextPanel
        context={workflowContext}
        hasRecords={records.length > 0}
      />
      <DentalSummaryPanel counts={counts} />
    </>
  );
}
