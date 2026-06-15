import { EyeMetricsPanel } from '../components/EyeMetricsPanel';
import { OptometryCheckupHistoryPanel } from '../components/OptometryCheckupHistoryPanel';
import { useOptometryContext } from '../hooks/useOptometryContext';

export function OptometryExamsTab() {
  const { records } = useOptometryContext();

  return (
    <>
      <EyeMetricsPanel records={records} />
      <OptometryCheckupHistoryPanel records={records} />
    </>
  );
}
