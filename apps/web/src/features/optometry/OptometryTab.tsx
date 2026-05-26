import { AppPage } from '../../shared/components/AppPage';
import { EyeImagingPanel } from './components/EyeImagingPanel';
import { EyeMetricsPanel } from './components/EyeMetricsPanel';
import { EyePrescriptionPanel } from './components/EyePrescriptionPanel';
import { OcularRecordsPanel } from './components/OcularRecordsPanel';
import { OptometryCheckupHistoryPanel } from './components/OptometryCheckupHistoryPanel';
import { OptometryHeader } from './components/OptometryHeader';
import { OptometrySummaryPanel } from './components/OptometrySummaryPanel';
import { useOptometryData } from './hooks/useOptometryData';

export function OptometryTab() {
  const { records, imaging, counts, status } = useOptometryData();

  return (
    <AppPage
      banner={
        <OptometryHeader
          recordCount={records.length}
          imageCount={imaging.length}
        />
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          <OptometrySummaryPanel counts={counts} />
          <div className="grid gap-4 xl:grid-cols-2">
            <EyePrescriptionPanel records={records} />
            <EyeMetricsPanel records={records} />
          </div>
          <OptometryCheckupHistoryPanel records={records} />
          <div className="grid gap-4 xl:grid-cols-2">
            <OcularRecordsPanel records={records} />
            <EyeImagingPanel items={imaging} />
          </div>
          {status === 'loading' && (
            <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
              Loading optometry records...
            </div>
          )}
        </div>
      </div>
    </AppPage>
  );
}
