import { OdontogramStatusPanel } from '../components/OdontogramStatusPanel';
import { ToothTimelinePanel } from '../components/ToothTimelinePanel';
import { useDentalContext } from '../hooks/useDentalContext';

export function DentalChartTab() {
  const { odontogramStatuses, toothTimeline } = useDentalContext();

  return (
    <>
      <OdontogramStatusPanel statuses={odontogramStatuses} />
      <ToothTimelinePanel items={toothTimeline} />
    </>
  );
}
