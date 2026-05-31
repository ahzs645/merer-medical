import { DentalClaimsPanel } from '../components/DentalClaimsPanel';
import { DentalRecordsPanel } from '../components/DentalRecordsPanel';
import { useDentalContext } from '../hooks/useDentalContext';

export function DentalRecordsTab() {
  const { records, claimSummaries } = useDentalContext();

  return (
    <>
      <DentalRecordsPanel records={records} />
      <DentalClaimsPanel claims={claimSummaries} />
    </>
  );
}
