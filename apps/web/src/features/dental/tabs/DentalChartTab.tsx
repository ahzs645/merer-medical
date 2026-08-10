import { OdontogramStatusPanel } from '../components/OdontogramStatusPanel';
import { ToothChartPanel } from '../components/ToothChartPanel';
import { ToothTimelinePanel } from '../components/ToothTimelinePanel';
import { useDentalContext } from '../hooks/useDentalContext';

export function DentalChartTab() {
  const { odontogramStatuses, recordsByTooth, toothTimeline } =
    useDentalContext();

  return (
    <>
      {/* The tab is named for the chart, so the chart leads it; the status and
          timeline cards below read as detail on whichever tooth you picked. */}
      <ToothChartPanel
        recordsByTooth={recordsByTooth}
        statuses={odontogramStatuses}
      />
      <OdontogramStatusPanel statuses={odontogramStatuses} />
      <ToothTimelinePanel items={toothTimeline} />
    </>
  );
}
