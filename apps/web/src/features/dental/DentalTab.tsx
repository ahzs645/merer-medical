import { AppPage } from '../../shared/components/AppPage';
import { DentalCleaningHistoryPanel } from './components/DentalCleaningHistoryPanel';
import { DentalHeader } from './components/DentalHeader';
import { DentalImagingPanel } from './components/DentalImagingPanel';
import { DentalRecordsPanel } from './components/DentalRecordsPanel';
import { DentalScanPreview } from './components/DentalScanPreview';
import { DentalSummaryPanel } from './components/DentalSummaryPanel';
import { ToothChartPanel } from './components/ToothChartPanel';
import { useDentalData } from './hooks/useDentalData';

export function DentalTab() {
  const { records, imaging, recordsByTooth, counts, status } = useDentalData();

  return (
    <AppPage
      banner={
        <DentalHeader
          recordCount={records.length}
          imageCount={imaging.length}
        />
      }
    >
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 pb-24 sm:px-6 lg:px-8">
          <DentalSummaryPanel counts={counts} />
          <ToothChartPanel recordsByTooth={recordsByTooth} />
          <DentalCleaningHistoryPanel records={records} />
          <DentalScanPreview />
          <div className="grid gap-4 lg:grid-cols-2">
            <DentalRecordsPanel records={records} />
            <DentalImagingPanel items={imaging} />
          </div>
          {status === 'loading' && (
            <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
              Loading dental records...
            </div>
          )}
        </div>
      </div>
    </AppPage>
  );
}
