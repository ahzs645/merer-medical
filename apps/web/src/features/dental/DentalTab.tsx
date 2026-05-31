import { AppPage } from '../../shared/components/AppPage';
import { DentalCleaningHistoryPanel } from './components/DentalCleaningHistoryPanel';
import { DentalHeader } from './components/DentalHeader';
import { DentalImagingPanel } from './components/DentalImagingPanel';
import { DentalRecordsPanel } from './components/DentalRecordsPanel';
import { DentalScanPreview } from './components/DentalScanPreview';
import { DentalSurgeryPanel } from './components/DentalSurgeryPanel';
import { DentalSummaryPanel } from './components/DentalSummaryPanel';
import { DentalWorkflowContextPanel } from './components/DentalWorkflowContextPanel';
import { OdontogramStatusPanel } from './components/OdontogramStatusPanel';
import { OrthodonticPanel } from './components/OrthodonticPanel';
import { PerioOverviewPanel } from './components/PerioOverviewPanel';
import { TreatmentPlanPanel } from './components/TreatmentPlanPanel';
import { ToothChartPanel } from './components/ToothChartPanel';
import { useDentalData } from './hooks/useDentalData';
import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';

export function DentalTab() {
  const {
    records,
    imaging,
    recordsByTooth,
    odontogramStatuses,
    treatmentPlan,
    perioOverview,
    workflowContext,
    counts,
    status,
  } = useDentalData();
  const { t } = useInterfaceLanguage();

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
          <OdontogramStatusPanel statuses={odontogramStatuses} />
          <div className="grid gap-4 lg:grid-cols-3">
            <TreatmentPlanPanel items={treatmentPlan} />
            <PerioOverviewPanel overview={perioOverview} />
            <DentalWorkflowContextPanel context={workflowContext} />
          </div>
          <OrthodonticPanel records={records} />
          <DentalSurgeryPanel records={records} />
          <DentalCleaningHistoryPanel records={records} />
          <DentalScanPreview imaging={imaging} />
          <div className="grid gap-4 lg:grid-cols-2">
            <DentalRecordsPanel records={records} />
            <DentalImagingPanel items={imaging} />
          </div>
          {status === 'loading' && (
            <div className="rounded-md bg-white p-8 text-center text-gray-600 shadow-sm ring-1 ring-gray-200">
              {t('Loading dental records...')}
            </div>
          )}
        </div>
      </div>
    </AppPage>
  );
}
