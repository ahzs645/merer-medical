import { DentalSummaryPanel } from '../components/DentalSummaryPanel';
import { DentalWorkflowContextPanel } from '../components/DentalWorkflowContextPanel';
import { useDentalContext } from '../hooks/useDentalContext';

export function DentalOverviewTab() {
  const { counts, records, workflowContext } = useDentalContext();

  return (
    <>
      <DentalSummaryPanel counts={counts} />
      <DentalWorkflowContextPanel
        context={workflowContext}
        hasRecords={records.length > 0}
      />
    </>
  );
}
