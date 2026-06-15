import { SurgicalHistoryPanel } from '../components/SurgicalHistoryPanel';
import { useOptometryContext } from '../hooks/useOptometryContext';

export function OptometrySurgeryTab() {
  const { records } = useOptometryContext();

  return <SurgicalHistoryPanel records={records} />;
}
