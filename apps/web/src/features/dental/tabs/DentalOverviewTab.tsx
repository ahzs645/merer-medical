import { DentalSummaryPanel } from '../components/DentalSummaryPanel';
import { DentalWorkflowContextPanel } from '../components/DentalWorkflowContextPanel';
import { ToothChartPanel } from '../components/ToothChartPanel';
import { useDentalContext } from '../hooks/useDentalContext';

export function DentalOverviewTab() {
  const { counts, recordsByTooth, workflowContext } = useDentalContext();

  return (
    <>
      <DentalSummaryPanel counts={counts} />
      <ToothChartPanel recordsByTooth={recordsByTooth} />
      <DentalWorkflowContextPanel context={workflowContext} />
    </>
  );
}
