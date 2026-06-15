import { CurrentPrescriptionPanel } from '../components/CurrentPrescriptionPanel';
import { PrescriptionTimelinePanel } from '../components/PrescriptionTimelinePanel';
import { useOptometryContext } from '../hooks/useOptometryContext';

export function OptometryPrescriptionsTab() {
  const { records } = useOptometryContext();

  return (
    <>
      <CurrentPrescriptionPanel records={records} />
      <PrescriptionTimelinePanel records={records} />
    </>
  );
}
