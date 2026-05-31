import { DentalCleaningHistoryPanel } from '../components/DentalCleaningHistoryPanel';
import { DentalRecallPanel } from '../components/DentalRecallPanel';
import { PerioOverviewPanel } from '../components/PerioOverviewPanel';
import { useDentalContext } from '../hooks/useDentalContext';

export function DentalHygieneTab() {
  const { records, perioOverview, recallItems } = useDentalContext();

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <PerioOverviewPanel overview={perioOverview} />
        <DentalRecallPanel recalls={recallItems} />
      </div>
      <DentalCleaningHistoryPanel records={records} />
    </>
  );
}
