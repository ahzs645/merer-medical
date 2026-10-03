import { ToothChartPanel } from '../components/ToothChartPanel';
import { useDentalContext } from '../hooks/useDentalContext';

export function DentalChartTab() {
  const { odontogramStatuses, recordsByTooth } = useDentalContext();

  // One panel: the chart, and beside it the selected tooth's history. The
  // two cards that used to follow it repeated the same teeth twice over.
  return (
    <ToothChartPanel
      recordsByTooth={recordsByTooth}
      statuses={odontogramStatuses}
    />
  );
}
