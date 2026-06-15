import { useInterfaceLanguage } from '../../app/providers/InterfaceLanguageProvider';
import { AppPage } from '../../shared/components/AppPage';
import { ErrorPanel, LoadingPanel } from '../../shared/components/StatusPanel';
import { CurrentPrescriptionPanel } from './components/CurrentPrescriptionPanel';
import { EyeImagingPanel } from './components/EyeImagingPanel';
import { EyeMetricsPanel } from './components/EyeMetricsPanel';
import { OcularRecordsPanel } from './components/OcularRecordsPanel';
import { OptometryCheckupHistoryPanel } from './components/OptometryCheckupHistoryPanel';
import { OptometryHeader } from './components/OptometryHeader';
import { OptometryQuickAdd } from './components/OptometryQuickAdd';
import { OptometrySummaryPanel } from './components/OptometrySummaryPanel';
import { PrescriptionTimelinePanel } from './components/PrescriptionTimelinePanel';
import { SurgicalHistoryPanel } from './components/SurgicalHistoryPanel';
import { useOptometryData } from './hooks/useOptometryData';

export function OptometryTab() {
  const { t } = useInterfaceLanguage();
  const { records, imaging, counts, status, error } = useOptometryData();

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
          {status === 'loading' ? (
            <LoadingPanel text={t('Loading optometry records...')} />
          ) : status === 'error' ? (
            <ErrorPanel
              error={error}
              text={t('Unable to load optometry records.')}
            />
          ) : (
            <>
              <OptometrySummaryPanel counts={counts} />
              <OptometryQuickAdd />
              <CurrentPrescriptionPanel records={records} />
              <PrescriptionTimelinePanel records={records} />
              <SurgicalHistoryPanel records={records} />
              <EyeMetricsPanel records={records} />
              <div className="grid gap-4 xl:grid-cols-2">
                <OptometryCheckupHistoryPanel records={records} />
                <OcularRecordsPanel records={records} />
              </div>
              <EyeImagingPanel items={imaging} />
            </>
          )}
        </div>
      </div>
    </AppPage>
  );
}
