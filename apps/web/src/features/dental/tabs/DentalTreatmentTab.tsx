import { DentalSurgeryPanel } from '../components/DentalSurgeryPanel';
import { OrthodonticPanel } from '../components/OrthodonticPanel';
import { TreatmentPlanPanel } from '../components/TreatmentPlanPanel';
import { useDentalContext } from '../hooks/useDentalContext';

export function DentalTreatmentTab() {
  const { records, treatmentPlan } = useDentalContext();

  return (
    <>
      <TreatmentPlanPanel items={treatmentPlan} />
      <OrthodonticPanel records={records} />
      <DentalSurgeryPanel records={records} />
    </>
  );
}
