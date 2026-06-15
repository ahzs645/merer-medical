import { OcularRecordsPanel } from '../components/OcularRecordsPanel';
import { useOptometryContext } from '../hooks/useOptometryContext';

export function OptometryRecordsTab() {
  const { records } = useOptometryContext();

  return <OcularRecordsPanel records={records} />;
}
