import { DentalCleaningHistoryPanel } from '../components/DentalCleaningHistoryPanel';
import { DentalNextCleaningPanel } from '../components/DentalNextCleaningPanel';
import { DentalRecallPanel } from '../components/DentalRecallPanel';
import { PerioOverviewPanel } from '../components/PerioOverviewPanel';
import { useDentalContext } from '../hooks/useDentalContext';

export function DentalHygieneTab() {
  const { records, perioOverview, recallItems, nextCleaning } =
    useDentalContext();

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <DentalNextCleaningPanel nextCleaning={nextCleaning} />
        <PerioOverviewPanel overview={perioOverview} />
      </div>
      {recallItems.length > 0 && <DentalRecallPanel recalls={recallItems} />}
      <DentalCleaningHistoryPanel records={records} />
    </>
  );
}
