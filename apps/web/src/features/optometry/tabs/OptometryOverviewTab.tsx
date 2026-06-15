import { OptometryQuickAdd } from '../components/OptometryQuickAdd';
import { OptometrySummaryPanel } from '../components/OptometrySummaryPanel';
import { useOptometryContext } from '../hooks/useOptometryContext';

export function OptometryOverviewTab() {
  const { counts } = useOptometryContext();

  return (
    <>
      <OptometrySummaryPanel counts={counts} />
      <OptometryQuickAdd />
    </>
  );
}
